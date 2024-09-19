import React, { useState } from 'react';

function NodeForm({ addNode }) {
  const [nodeType, setNodeType] = useState('function');
  const [nodeName, setNodeName] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState('');
  const [output, setOutput] = useState('');
  const [model, setModel] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newNode = {
      type: nodeType,
      name: nodeName,
      description: nodeType === 'function' ? description : null,
      params: nodeType === 'function' ? params.split(',').map(p => p.trim()) : null,
      output: nodeType === 'function' ? output : null,
      model: nodeType === 'decision' ? model : null,
    };
    addNode(newNode);
    // Reset form
    setNodeName('');
    setDescription('');
    setParams('');
    setOutput('');
    setModel('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Node</h2>
      <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
        <option value="function">Function Node</option>
        <option value="decision">Decision Node</option>
      </select>
      <input
        type="text"
        placeholder="Node Name"
        value={nodeName}
        onChange={(e) => setNodeName(e.target.value)}
        required
      />
      {nodeType === 'function' && (
        <>
          <textarea
            placeholder="Function Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Parameters (comma-separated)"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Output"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            required
          />
        </>
      )}
      {nodeType === 'decision' && (
        <input
          type="text"
          placeholder="Model (e.g., 'gpt-4-0125-preview')"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
      )}
      <button type="submit">Add Node</button>
    </form>
  );
}

export default NodeForm;