import React, { useState } from 'react';

function LinkNodesForm({ linkNodes, nodes }) {
  const [fromNode, setFromNode] = useState('');
  const [toNode, setToNode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (fromNode && toNode) {
      linkNodes(fromNode, [toNode]);
      setFromNode('');
      setToNode('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Link Nodes</h2>
      <div>
        <label htmlFor="fromNode">From Node: </label>
        <select
          id="fromNode"
          value={fromNode}
          onChange={(e) => setFromNode(e.target.value)}
          required
        >
          <option value="">Select 'from' node</option>
          {nodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="toNode">To Node: </label>
        <select
          id="toNode"
          value={toNode}
          onChange={(e) => setToNode(e.target.value)}
          required
        >
          <option value="">Select 'to' node</option>
          {nodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit">Link Nodes</button>
    </form>
  );
}

export default LinkNodesForm;