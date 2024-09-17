import React, { useState } from 'react';

function ConnectionForm({ addConnection, nodes }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    addConnection(from, to);
    setFrom('');
    setTo('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={from} onChange={(e) => setFrom(e.target.value)}>
        <option value="">Select 'from' node</option>
        {nodes.map((node) => (
          <option key={node.name} value={node.name}>
            {node.name}
          </option>
        ))}
      </select>
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">Select 'to' node</option>
        {nodes.map((node) => (
          <option key={node.name} value={node.name}>
            {node.name}
          </option>
        ))}
      </select>
      <button type="submit">Add Connection</button>
    </form>
  );
}

export default ConnectionForm;