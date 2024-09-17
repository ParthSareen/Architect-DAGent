import React, { useState } from 'react';
import NodeForm from './components/NodeForm';
import DAGVisualization from './components/DAGVisualization';
import ConnectionForm from './components/ConnectionForm';

function App() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  const addNode = (node) => {
    setNodes([...nodes, node]);
  };

  const addConnection = (from, to) => {
    setConnections([...connections, { from, to }]);
  };

  return (
    <div className="App">
      <h1>DAGent Frontend</h1>
      <NodeForm addNode={addNode} />
      <ConnectionForm addConnection={addConnection} nodes={nodes} />
      <DAGVisualization nodes={nodes} connections={connections} />
    </div>
  );
}

export default App;