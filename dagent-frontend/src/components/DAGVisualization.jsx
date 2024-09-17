import React, { useCallback } from 'react';
import ReactFlow, { Background, Controls, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';

function DAGVisualization({ nodes, connections }) {
  const [flowNodes, setFlowNodes] = React.useState([]);
  const [flowEdges, setFlowEdges] = React.useState([]);

  React.useEffect(() => {
    const newNodes = nodes.map((node, index) => ({
      id: node.name,
      type: 'default',
      data: { label: `${node.type === 'function' ? '🔷' : '🔶'} ${node.name}` },
      position: { x: 100 * (index + 1), y: 100 * (index + 1) },
    }));
    setFlowNodes(newNodes);

    const newEdges = connections.map((connection, index) => ({
      id: `e${index}`,
      source: connection.from,
      target: connection.to,
      animated: true,
    }));
    setFlowEdges(newEdges);
  }, [nodes, connections]);

  const onNodesChange = useCallback(
    (changes) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setFlowEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div style={{ height: '400px' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default DAGVisualization;