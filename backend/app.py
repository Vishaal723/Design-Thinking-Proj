from flask import Flask, request, jsonify
from flask_cors import CORS
from model import MealRecommender
import sqlite3
import pandas as pd
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

MODEL = None

def init_db():
    conn = sqlite3.connect('kitchen.db', timeout=15)
    # Users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            address TEXT
        )
    ''')
    try:
        conn.execute("ALTER TABLE users ADD COLUMN address TEXT")
    except sqlite3.OperationalError:
        pass # Already exists
    # Meals table
    df = pd.read_csv('../cloud_kitchen_meals.csv')
    df['price'] = (df['calories'] * 0.12 + df['protein'] * 1.5 + df['carbs'] * 0.3 + df['fat'] * 0.8).round(0).astype(int)
    df.to_sql('meals', conn, if_exists='replace', index=False)
    # Orders table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            total_amount REAL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            food_id INTEGER,
            food_name TEXT,
            price REAL,
            quantity INTEGER,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
    ''')
    conn.commit()
    conn.close()
    print("Kitchen DB ready (users + meals + orders)")

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400
    
    conn = sqlite3.connect('kitchen.db', timeout=15)
    cursor = conn.cursor()
    # Check if user exists
    cursor.execute("SELECT id, username, password FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    
    if user:
        if user[2] != password:
             conn.close()
             return jsonify({"error": "Incorrect password"}), 401
        user_id = str(user[0])
    else:
        # Register new user
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        user_id = str(cursor.lastrowid)
    
    conn.close()
    return jsonify({"message": "Success", "user_id": user_id, "username": username})

@app.route('/api/user/address', methods=['POST'])
def update_address():
    data = request.json
    user_id = data.get('user_id')
    address = data.get('address')
    if not user_id or not address:
        return jsonify({"error": "Missing info"}), 400
    conn = sqlite3.connect('kitchen.db', timeout=15)
    conn.execute("UPDATE users SET address = ? WHERE id = ?", (address, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Address updated", "address": address})

@app.route('/api/meals', methods=['GET'])
def get_meals():
    conn = sqlite3.connect('kitchen.db', timeout=15)
    df = pd.read_sql_query("SELECT food_id, food_name, category, calories, protein, carbs, fat, price FROM meals LIMIT 100", conn)
    conn.close()
    return jsonify(df.to_dict('records'))

@app.route('/api/recommend', methods=['POST'])
def recommend():
    global MODEL
    data = request.json
    weight = data.get('weight')
    goal = data.get('goal')
    top_n = data.get('top_n', 5)
    category = data.get('category', None)
    if not weight or not goal:
        return jsonify({"error": "Missing weight or goal"}), 400
    try:
        result = MODEL.recommend(float(weight), goal, int(top_n), category)
        # Add prices
        conn = sqlite3.connect('kitchen.db', timeout=15)
        prices = pd.read_sql_query("SELECT food_id, price FROM meals", conn).set_index('food_id')['price'].to_dict()
        conn.close()
        for rec in result['recommendations']:
            rec['price'] = prices.get(rec.get('food_id', 0), 0)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def categories():
    conn = sqlite3.connect('kitchen.db', timeout=15)
    df = pd.read_sql_query("SELECT DISTINCT category FROM meals ORDER BY category", conn)
    conn.close()
    return jsonify([row['category'] for _, row in df.iterrows()])

@app.route('/api/checkout', methods=['POST'])
def checkout_cart():
    data = request.json
    user_id = data.get('user_id', 'guest')
    items = data.get('items', [])
    if not items:
        return jsonify({"error": "No items"}), 400
        
    conn = sqlite3.connect('kitchen.db', timeout=15)
    order_id = conn.execute("INSERT INTO orders (user_id) VALUES (?)", (user_id,)).lastrowid
    
    total = 0
    for item in items:
        food_id = item['food_id']
        food_name = item.get('food_name', item.get('meal_name', 'Meal'))
        price = item['price']
        quantity = item.get('quantity', 1)
        total += price * quantity
        conn.execute("INSERT INTO order_items (order_id, food_id, food_name, price, quantity) VALUES (?, ?, ?, ?, ?)",
                     (order_id, food_id, food_name, price, quantity))
                     
    conn.execute("UPDATE orders SET total_amount = ? WHERE id = ?", (total, order_id))
    conn.commit()
    conn.close()
    return jsonify({"order_id": order_id, "total": total, "status": "pending"})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    user_id = request.args.get('user_id', 'guest')
    conn = sqlite3.connect('kitchen.db', timeout=15)
    orders = pd.read_sql_query("""
        SELECT o.*, GROUP_CONCAT(oi.food_name || ' x' || oi.quantity) as items 
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        WHERE o.user_id = ?
        GROUP BY o.id 
        ORDER BY o.created_at DESC LIMIT 10
    """, conn, params=(user_id,))
    conn.close()
    return jsonify(orders.to_dict('records'))

@app.route('/api/orders/clear', methods=['POST'])
def clear_orders():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    conn = sqlite3.connect('kitchen.db', timeout=15)
    conn.execute("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", (user_id,))
    conn.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "History cleared"})

if __name__ == '__main__':
    init_db()  # Ensures new migrations logic like ALTER executes safely on existing DBs
    MODEL = MealRecommender('kitchen.db')
    print("Cloud Kitchen API ready: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

