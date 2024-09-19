import json
import os

DAG_FILE = 'dag_data.json'

def save_dag(nodes, connections, entry_node=None):
    data = {
        'nodes': nodes,
        'connections': connections,
        'entry_node': entry_node
    }
    with open(DAG_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def load_dag():
    if not os.path.exists(DAG_FILE):
        return {}, {}
    with open(DAG_FILE, 'r') as f:
        data = json.load(f)
    return data.get('nodes', {}), data.get('connections', {}), data.get('entry_node', {})