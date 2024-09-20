from flask import Flask, request, jsonify
from flask_cors import CORS
from dagent import DecisionNode, FunctionNode, call_llm
import logging
from dag_storage import save_dag, load_dag
import types
import sys
import importlib
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Global variables to store our nodes
nodes = {}
connections = {}
entry_node = None
node_instances = {}  # New dict to map node name to actual node instance

DYNAMIC_MODULE_DIR = os.path.join(os.path.dirname(__file__), 'dynamic_modules')
os.makedirs(DYNAMIC_MODULE_DIR, exist_ok=True)

# Add the dynamic module directory to Python's path
sys.path.append(DYNAMIC_MODULE_DIR)

def create_function_with_source(function_code, function_name):
    # Create a new module file
    module_name = f"{function_name}_node"
    module_path = os.path.join(DYNAMIC_MODULE_DIR, f"{module_name}.py")
    
    with open(module_path, 'w') as f:
        f.write(function_code)
    
    # Import the new module
    module = importlib.import_module(module_name)
    importlib.reload(module)  # Reload in case the module was previously imported
    
    # Get the function from the module
    func = getattr(module, function_name)
    return func


def load_nodes():
    global nodes, connections, entry_node, node_instances
    loaded_nodes, loaded_connections, loaded_entry_node = load_dag()
    
    for name, node_data in loaded_nodes.items():
        if node_data['type'] == 'function':
            func = create_function_with_source(node_data['function_code'], node_data['function_name'])
            node_instances[name] = FunctionNode(func=func)
        elif node_data['type'] == 'decision':
            node_instances[name] = DecisionNode(model=node_data['model'])
    
    # Update next_nodes for each node instance
    for name, next_node_names in loaded_connections.items():
        if name in node_instances:
            node_instances[name].next_nodes = [node_instances[next_name] for next_name in next_node_names if next_name in node_instances]
    
    nodes = loaded_nodes
    connections = loaded_connections
    entry_node = loaded_entry_node

load_nodes()

def generate_function_with_llm(name, description, params, output):
    prompt = f"""
    Create a Python function based on the following description:
    
    Name: {name}
    Description: {description}
    Parameters: {', '.join(params)}
    Output: {output}
    
    Please provide only the function code without any additional explanation.
    """
    
    response = call_llm(
        model="gpt-4-0125-preview",  # or another suitable model
        messages=[
            {"role": "system", "content": "You are a helpful assistant that generates Python functions."},
            {"role": "user", "content": prompt}
        ]
    )
    
    return response

@app.route('/add_function_node', methods=['POST'])
def add_function_node():
    global nodes, node_instances
    data = request.json
    function_name = data['name']
    node_name = f"{function_name}_node"
    description = data['description']
    params = data['params']
    output = data['output']
    
    function_code = generate_function_with_llm(function_name, description, params, output)
    print('function_code:', function_code)
    
    # Be cautious with exec, it can be a security risk if not properly sanitized
    function_code = function_code.strip()
    if function_code.startswith("```python"):
        function_code = function_code[9:]  # Remove ```python
    if function_code.endswith("```"):
        function_code = function_code[:-3]  # Remove trailing ```
    function_code = function_code.strip()
    
    func = create_function_with_source(function_code, function_name)
    node_instances[node_name] = FunctionNode(func=func)
    nodes[node_name] = {
        'type': 'function',
        'function_name': function_name,
        'description': description,
        'params': params,
        'output': output,
        'function_code': function_code
    }
    print('nodes:', nodes)
    print('node_name:', node_name)
    try:
        # No need to exec the function code here as it's already loaded in create_function_with_source
        pass
    except SyntaxError as e:
        return jsonify({"error": f"Syntax error in generated function: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Error executing generated function: {str(e)}"}), 500
    
    save_dag(nodes, connections)
    return jsonify({"message": f"Function Node {node_name} added successfully"}), 200

@app.route('/add_decision_node', methods=['POST'])
def add_decision_node():
    global nodes, node_instances
    data = request.json
    node_name = data['name'] + '_node'
    model = data['model']
    
    node_instances[node_name] = DecisionNode(model=model)
    nodes[node_name] = {
        'type': 'decision',
        'node_name': node_name,
        'model': model
    }
    save_dag(nodes, connections)
    return jsonify({"message": f"Decision Node {node_name} added successfully"}), 200

@app.route('/set_entry_node', methods=['POST'])
def set_entry_node():
    global entry_node, nodes, connections
    data = request.json
    node_name = data['name']
    
    if node_name in nodes:
        entry_node = node_name
        save_dag(nodes, connections, entry_node)
        return jsonify({"message": f"Entry node set to {node_name}"}), 200
    else:
        return jsonify({"error": "Node not found"}), 400

@app.route('/link_nodes', methods=['POST'])
def link_nodes():
    global nodes, connections, node_instances
    data = request.json
    from_node = data['from']
    to_nodes = data['to']
    print('to_nodes:', to_nodes)
    # from_node = f"{from_function}_node"
    # to_nodes = [f"{func}_node" for func in to_nodes]
    # print('from_node:', from_node)
    # print('node_in', node_instances)
    # print('nodes', nodes)
    # Ensure all keys in node_instances end with '_node'
    node_instances = {
        f"{key}_node" if not key.endswith('_node') else key: value
        for key, value in node_instances.items()
    }

    # Update the nodes dictionary to match the new node_instances keys
    nodes = {
        f"{key}_node" if not key.endswith('_node') else key: value
        for key, value in nodes.items()
    }

    # Update connections to use the new node names
    connections = {
        f"{from_node}_node" if not from_node.endswith('_node') else from_node: [
            f"{to_node}_node" if not to_node.endswith('_node') else to_node
            for to_node in to_nodes
        ]
        for from_node, to_nodes in connections.items()
    }

    # Update entry_node if it exists
    if from_node in nodes and from_node in node_instances:
        current_node = node_instances[from_node]
        if not hasattr(current_node, 'next_nodes'):
            current_node.next_nodes = []
        elif isinstance(current_node.next_nodes, dict):
            # current_node.next_nodes = list(current_node.next_nodes.values())
            current_node.next_nodes = []
        
        for to_node in to_nodes:
            print('to_node:', to_node)
            if not to_node.endswith('_node'):
                to_node += '_node'
            if to_node in node_instances:
                if to_node not in current_node.next_nodes:
                    current_node.next_nodes.append(node_instances[to_node])
        
        print(current_node.next_nodes)
        if from_node not in connections:
            connections[from_node] = []
        connections[from_node] = list(set(connections[from_node] + [to_node for to_node in to_nodes if to_node in node_instances]))
        
        # Remove any connections to nodes that no longer exist
        connections[from_node] = [node for node in connections[from_node] if node in node_instances]
        
        # Remove empty lists from connections
        connections = {k: v for k, v in connections.items() if v}
        
        print('connections:', connections)
        
        save_dag(nodes, connections)
        return jsonify({"message": "Nodes linked successfully"}), 200
    else:
        return jsonify({"error": "From node not found or not initialized"}), 400

@app.route('/get_dag', methods=['GET'])
def get_dag():
    return jsonify({
        "nodes": nodes,
        "connections": connections,
        "entry_node": entry_node
    }), 200

@app.route('/compile', methods=['POST'])
def compile_dag():
    global entry_node
    if entry_node and entry_node in node_instances:
        try:
            node_instances[entry_node].compile(force_load=False)
            return jsonify({"message": "DAG compiled successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Entry node not set or not found"}), 400


@app.route('/execute', methods=['POST'])
def execute_dag():
    global entry_node, node_instances
    data = request.json
    user_input = data['input']
    
    if entry_node and entry_node in node_instances:
        try:
            node_instances[entry_node].run(user_input=user_input)
            result = None
            print(node_instances.values())
            for node in node_instances.values():
                if not node.next_nodes:  # This is a leaf node
                    result = node.node_result
                    if result is not None:
                        break
            return jsonify({"result": result}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Entry node not set or not found"}), 400


@app.route('/clear_dag', methods=['POST'])
def clear_dag():
    global nodes, connections, entry_node, node_instances
    nodes = {}
    connections = {}
    entry_node = None
    node_instances = {}
    save_dag(nodes, connections, entry_node)
    return jsonify({"message": "DAG cleared successfully"}), 200

@app.route('/delete_node/<node_id>', methods=['DELETE'])
def delete_node(node_id):
    global nodes, connections, entry_node, node_instances
    if node_id in nodes:
        del nodes[node_id]
        if node_id in node_instances:
            del node_instances[node_id]
        # Remove any connections involving this node
        connections = {from_node: to_nodes for from_node, to_nodes in connections.items() if from_node != node_id}
        for from_node, to_nodes in connections.items():
            connections[from_node] = [to for to in to_nodes if to != node_id]
        # If this was the entry node, clear it
        if entry_node == node_id:
            entry_node = None
        save_dag(nodes, connections, entry_node)
        return jsonify({"message": f"Node {node_id} deleted successfully"}), 200
    else:
        return jsonify({"error": "Node not found"}), 404


if __name__ == '__main__':
    app.run(debug=True)