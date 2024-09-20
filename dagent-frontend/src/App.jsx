import React, { useState, useCallback, useEffect } from 'react';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import NodeForm from './components/NodeForm';
import DAGVisualization from './components/DAGVisualization';
import LinkNodesForm from './components/LinkNodesForm';

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [entryNode, setEntryNode] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    const loadDAG = async () => {
      const response = await fetch('http://127.0.0.1:5000/get_dag');
      if (response.ok) {
        const data = await response.json();
        const newNodes = Object.entries(data.nodes).map(([id, node]) => ({
          id,
          type: 'default',
          data: { 
            label: `${node.type === 'function' ? '🔷' : '🔶'} ${node.function_name || id}`,
            nodeData: node
          },
          position: { x: 0, y: 0 }, // Initial position
        }));
        setNodes(newNodes);
        const newEdges = Object.entries(data.connections).flatMap(([from, tos]) => 
          tos.map(to => ({ id: `e${from}-${to}`, source: from, target: to, animated: true }))
        );
        setEdges(newEdges);
        setEntryNode(data.entry_node);
        console.log('Loaded nodes:', newNodes);
        console.log('Loaded edges:', newEdges);
      }
    };
    loadDAG();
  }, []);

  const addNode = async (node) => {
    const endpoint = node.type === 'function' ? '/add_function_node' : '/add_decision_node';
    const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    if (response.ok) {
      const newNode = {
        id: node.name,
        type: 'default',
        data: { label: `${node.type === 'function' ? '🔷' : '🔶'} ${node.name}` },
        position: { x: Math.random() * 500, y: Math.random() * 500 },
      };
      setNodes((nds) => [...nds, newNode]);
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
      const newEdge = { id: `e${from}-${to}`, source: from, target: to, animated: true };
      setEdges((eds) => [...eds, newEdge]);
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
      setNodes((nds) => 
        nds.map((node) => 
          node.id === nodeName 
            ? { ...node, style: { ...node.style, border: '2px solid red' } }
            : node.id === entryNode
              ? { ...node, style: { ...node.style, border: 'none' } }
              : node
        )
      );
    } else {
      console.error('Failed to set entry node');
    }
  };

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

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

  const clearDAG = async () => {
    const response = await fetch('http://127.0.0.1:5000/clear_dag', { method: 'POST' });
    if (response.ok) {
      setNodes([]);
      setEdges([]);
      setEntryNode(null);
    } else {
      console.error('Failed to clear DAG');
    }
  };

  const deleteNode = async (nodeId) => {
    const response = await fetch(`http://127.0.0.1:5000/delete_node/${nodeId}`, { method: 'DELETE' });
    if (response.ok) {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      if (entryNode === nodeId) {
        setEntryNode(null);
      }
    } else {
      console.error('Failed to delete node');
    }
  };


  return (
    <div className="App">
      <h1>DAGent Workflow Builder</h1>
      <NodeForm addNode={addNode} />
      <LinkNodesForm linkNodes={linkNodes} nodes={nodes} />
      <button onClick={clearDAG}>Clear DAG</button>
      <DAGVisualization 
        initialNodes={nodes} 
        initialEdges={edges}
        onNodesChangeParent={onNodesChange}
        onEdgesChangeParent={onEdgesChange}
        onDeleteNode={deleteNode}
      />
      <div>
        <h2>Set Entry Node</h2>
        <select onChange={(e) => setEntryNodeHandler(e.target.value)}>
          <option value="">Select entry node</option>
          {nodes.map(node => (
            <option key={node.id} value={node.id}>{node.id}</option>
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