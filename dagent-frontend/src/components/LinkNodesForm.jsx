import React, { useState } from 'react';

function LinkNodesForm({ linkNodes, nodes }) {
  const [fromNode, setFromNode] = useState('');
  const [toNodes, setToNodes] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    linkNodes(fromNode, toNodes);
    // Reset form
    setFromNode('');
    setToNodes([]);
  };

  const handleToNodesChange = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setToNodes(selectedValues);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Link Nodes</h2>
      <select value={fromNode} onChange={(e) => setFromNode(e.target.value)} required>
        <option value="">Select 'from' node</option>
        {nodes.map(node => (
          <option key={node.name} value={node.name}>{node.name}</option>
        ))}
      </select>
      <select multiple value={toNodes} onChange={handleToNodesChange} required>
        {nodes.map(node => (
          <option key={node.name} value={node.name}>{node.name}</option>
        ))}
      </select>
      <button type="submit">Link Nodes</button>
    </form>
  );
}

export default LinkNodesForm;