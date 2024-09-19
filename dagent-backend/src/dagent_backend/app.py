from flask import Flask, request, jsonify
from flask_cors import CORS
from dagent import DecisionNode, FunctionNode, call_llm
import logging
from dag_storage import save_dag, load_dag

app = Flask(__name__)
CORS(app)

# Global variables to store our nodes
nodes = {}
connections = {}
entry_node = None
node_instances = {}  # New dict to map node name to actual node instance

def load_nodes():
    global nodes, connections, entry_node, node_instances
    loaded_nodes, loaded_connections, loaded_entry_node = load_dag()
    
    for name, node_data in loaded_nodes.items():
        if node_data['type'] == 'function':
            exec(node_data['function_code'])
            function_name = node_data['function_code'].split('def ')[1].split('(')[0].strip()
            node_instances[name] = FunctionNode(func=locals()[function_name])
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

def generate_function_with_llm(description, params, output):
    prompt = f"""
    Create a Python function based on the following description:
    
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
    name = data['name']
    description = data['description']
    params = data['params']
    output = data['output']
    
    function_code = generate_function_with_llm(description, params, output)
    print('function_code:', function_code)
    
    # Be cautious with exec, it can be a security risk if not properly sanitized
    function_code = function_code.strip()
    if function_code.startswith("```python"):
        function_code = function_code[9:]  # Remove ```python
    if function_code.endswith("```"):
        function_code = function_code[:-3]  # Remove trailing ```
    function_code = function_code.strip()
    
    try:
        exec(function_code)
    except SyntaxError as e:
        return jsonify({"error": f"Syntax error in generated function: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Error executing generated function: {str(e)}"}), 500
    # Extract the function name from the generated code
    function_name = function_code.split('def ')[1].split('(')[0].strip()
    node_instances[name] = FunctionNode(func=locals()[function_name])
    nodes[name] = {
        'type': 'function',
        'description': description,
        'params': params,
        'output': output,
        'function_code': function_code
    }
    save_dag(nodes, connections)
    return jsonify({"message": f"Function Node {name} added successfully"}), 200

@app.route('/add_decision_node', methods=['POST'])
def add_decision_node():
    global nodes, node_instances
    data = request.json
    name = data['name']
    model = data['model']
    
    node_instances[name] = DecisionNode(model=model)
    nodes[name] = {
        'type': 'decision',
        'model': model
    }
    save_dag(nodes, connections)
    return jsonify({"message": f"Decision Node {name} added successfully"}), 200

@app.route('/set_entry_node', methods=['POST'])
def set_entry_node():
    global entry_node, nodes, connections
    data = request.json
    name = data['name']
    
    if name in nodes:
        entry_node = name
        save_dag(nodes, connections, entry_node)
        return jsonify({"message": f"Entry node set to {name}"}), 200
    else:
        return jsonify({"error": "Node not found"}), 400

@app.route('/link_nodes', methods=['POST'])
def link_nodes():
    global nodes, connections, node_instances
    data = request.json
    from_node = data['from']
    to_nodes = data['to']
    
    if from_node in nodes and from_node in node_instances:
        current_node = node_instances[from_node]
        if not hasattr(current_node, 'next_nodes'):
            current_node.next_nodes = []
        elif isinstance(current_node.next_nodes, dict):
            # current_node.next_nodes = list(current_node.next_nodes.values())
            current_node.next_nodes = []
        
        for to_node in to_nodes:
            if to_node in node_instances:
                if to_node not in current_node.next_nodes:
                    print('cur next', current_node.next_nodes)
                    current_node.next_nodes.append(node_instances[to_node])
        
        if from_node not in connections:
            connections[from_node] = []
        connections[from_node].extend([to_node for to_node in to_nodes if to_node in node_instances and to_node not in connections[from_node]])
        
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
    global entry_node, node_instances
    if entry_node and entry_node in node_instances:
        print('entry_node:', entry_node.next_nodes)
        node_instances[entry_node].compile(force_load=True)
        return jsonify({"message": "DAG compiled successfully"}), 200
    else:
        return jsonify({"error": "Entry node not set or not found"}), 400

@app.route('/execute', methods=['POST'])
def execute_dag():
    global entry_node, node_instances
    data = request.json
    user_input = data['input']
    
    if entry_node and entry_node in node_instances:
        try:
            result = node_instances[entry_node].run(user_input=user_input)
            return jsonify({"result": result}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Entry node not set or not found"}), 400

if __name__ == '__main__':
    app.run(debug=True)