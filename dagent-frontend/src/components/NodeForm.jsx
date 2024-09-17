import React, { useState } from 'react';

function NodeForm({ addNode }) {
  const [nodeType, setNodeType] = useState('function');
  const [nodeName, setNodeName] = useState('');
  const [functionCode, setFunctionCode] = useState('');
  const [model, setModel] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newNode = {
      type: nodeType,
      name: nodeName,
      functionCode: nodeType === 'function' ? functionCode : null,
      model: nodeType === 'decision' ? model : null,
    };
    addNode(newNode);
    // Reset form
    setNodeName('');
    setFunctionCode('');
    setModel('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
        <option value="function">Function Node</option>
        <option value="decision">Decision Node</option>
      </select>
      <input
        type="text"
        placeholder="Node Name"
        value={nodeName}
        onChange={(e) => setNodeName(e.target.value)}
      />
      {nodeType === 'function' && (
        <textarea
          placeholder="Function Code"
          value={functionCode}
          onChange={(e) => setFunctionCode(e.target.value)}
        />
      )}
      {nodeType === 'decision' && (
        <input
          type="text"
          placeholder="Model (e.g., 'groq/llama3-70b-8192')"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      )}
      <button type="submit">Add Node</button>
    </form>
  );
}

export default NodeForm;