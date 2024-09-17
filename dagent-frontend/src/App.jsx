import React, { useState } from 'react';
import NodeForm from './components/NodeForm';
import DAGVisualization from './components/DAGVisualization';
import LinkNodesForm from './components/LinkNodesForm';

function App() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [entryNode, setEntryNode] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);

  const addNode = async (node) => {
    const endpoint = node.type === 'function' ? '/add_function_node' : '/add_decision_node';
    const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    if (response.ok) {
      setNodes([...nodes, node]);
    } else {
      console.error('Failed to add node');
    }
  };

  const linkNodes = async (from, to) => {
    const response = await fetch('http://127.0.0.1:5000/link_nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    if (response.ok) {
      setConnections([...connections, { from, to }]);
    } else {
      console.error('Failed to link nodes');
    }
  };

  const setEntryNodeHandler = async (nodeName) => {
    const response = await fetch('http://127.0.0.1:5000/set_entry_node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nodeName }),
    });
    if (response.ok) {
      setEntryNode(nodeName);
    } else {
      console.error('Failed to set entry node');
    }
  };

  const compileDAG = async () => {
    const response = await fetch('http://127.0.0.1:5000/compile', { method: 'POST' });
    if (response.ok) {
      console.log('DAG compiled successfully');
    } else {
      console.error('Failed to compile DAG');
    }
  };

  const executeDAG = async (input) => {
    const response = await fetch('http://127.0.0.1:5000/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await response.json();
    if (response.ok) {
      setExecutionResult(data.result);
    } else {
      console.error('Failed to execute DAG:', data.error);
    }
  };

  return (
    <div className="App">
    <h1>DAGent Workflow Builder</h1>
    <NodeForm addNode={addNode} />
    <LinkNodesForm linkNodes={linkNodes} nodes={nodes} />
    <DAGVisualization nodes={nodes} connections={connections} entryNode={entryNode} />
      <div>
        <h2>Set Entry Node</h2>
        <select onChange={(e) => setEntryNodeHandler(e.target.value)}>
          <option value="">Select entry node</option>
          {nodes.map(node => (
            <option key={node.name} value={node.name}>{node.name}</option>
          ))}
        </select>
      </div>
      <button onClick={compileDAG}>Compile DAG</button>
      <div>
        <h2>Execute DAG</h2>
        <input type="text" id="dagInput" placeholder="Enter input for DAG" />
        <button onClick={() => executeDAG(document.getElementById('dagInput').value)}>Execute</button>
      </div>
      {executionResult && (
        <div>
          <h2>Execution Result:</h2>
          <pre>{JSON.stringify(executionResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;