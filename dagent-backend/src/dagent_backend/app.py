from flask import Flask, request, jsonify
from flask_cors import CORS
from dagent import DecisionNode, FunctionNode
import logging

app = Flask(__name__)
CORS(app)

# Global variables to store our nodes
nodes = {}
entry_node = None

@app.route('/add_function_node', methods=['POST'])
def add_function_node():
    data = request.json
    name = data['name']
    function_code = data['functionCode']
    
    # Be cautious with exec, it can be a security risk if not properly sanitized
    print('name:', name)
    print('function_code:', function_code)

    exec(function_code)
    
    # Extract the function name from the first line of the function code
    function_name = function_code.split('\n')[0].split('def ')[1].split('(')[0].strip()
    
    node = FunctionNode(func=locals()[function_name])
    nodes[name] = node
    
    return jsonify({"message": f"Function Node {name} added successfully"}), 200

@app.route('/add_decision_node', methods=['POST'])
def add_decision_node():
    data = request.json
    name = data['name']
    model = data['model']
    
    node = DecisionNode(model=model, api_base=None)
    nodes[name] = node
    
    return jsonify({"message": f"Decision Node {name} added successfully"}), 200

@app.route('/set_entry_node', methods=['POST'])
def set_entry_node():
    global entry_node
    data = request.json
    name = data['name']
    
    if name in nodes:
        entry_node = nodes[name]
        return jsonify({"message": f"Entry node set to {name}"}), 200
    else:
        return jsonify({"error": "Node not found"}), 400

@app.route('/link_nodes', methods=['POST'])
def link_nodes():
    data = request.json
    from_node = data['from']
    to_nodes = data['to']
    
    if from_node in nodes:
        nodes[from_node].next_nodes = [nodes[to_node] for to_node in to_nodes if to_node in nodes]
        return jsonify({"message": "Nodes linked successfully"}), 200
    else:
        return jsonify({"error": "From node not found"}), 400

@app.route('/compile', methods=['POST'])
def compile_dag():
    global entry_node
    if entry_node:
        entry_node.compile(force_load=True)
        return jsonify({"message": "DAG compiled successfully"}), 200
    else:
        return jsonify({"error": "Entry node not set"}), 400

@app.route('/execute', methods=['POST'])
def execute_dag():
    global entry_node
    data = request.json
    user_input = data['input']
    
    if entry_node:
        try:
            result = entry_node.run(input=user_input)
            return jsonify({"result": result}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Entry node not set"}), 400

if __name__ == '__main__':
    app.run(debug=True)