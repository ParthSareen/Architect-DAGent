import React from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';

function DAGVisualization({ nodes, connections, entryNode }) {
  const elements = [
    ...nodes.map((node, index) => ({
      id: node.name,
      type: 'default',
      data: { 
        label: `${node.type === 'function' ? '🔷' : '🔶'} ${node.name}${node.name === entryNode ? ' (Entry)' : ''}` 
      },
      position: { x: 100 * (index + 1), y: 100 * (index + 1) },
      style: node.name === entryNode ? { border: '2px solid red' } : {}
    })),
    ...connections.map((connection, index) => ({
      id: `e${index}`,
      source: connection.from,
      target: connection.to,
      animated: true,
    })),
  ];

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <ReactFlow elements={elements}>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default DAGVisualization;