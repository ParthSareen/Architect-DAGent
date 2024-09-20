import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { useNodesState, useEdgesState, Controls, Background, Handle } from 'reactflow';
import 'reactflow/dist/style.css';

const gridSpacing = 200;

const CustomNode = ({ data, isConnectable, onDeleteNode }) => (
  <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', background: 'white' }}>
    <div>{data.label}</div>
    <button onClick={() => onDeleteNode(data.id)}>Delete</button>
    <Handle type="target" position="top" isConnectable={isConnectable} />
    <Handle type="source" position="bottom" isConnectable={isConnectable} />
  </div>
);

function DAGVisualization({ initialNodes, initialEdges, onNodesChangeParent, onEdgesChangeParent, onDeleteNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLayouting, setIsLayouting] = useState(false);

  const layout = useCallback(() => {
    console.log('Running layout with nodes:', nodes);
    console.log('and edges:', edges);
    if (nodes.length === 0) return;

    setIsLayouting(true);

    const levels = {};
    const visited = new Set();

    const dfs = (nodeId, level = 0) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      if (!levels[level]) levels[level] = [];
      levels[level].push(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => dfs(edge.target, level + 1));
    };

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    rootNodes.forEach(node => dfs(node.id));

    const newNodes = nodes.map(node => {
      const level = Object.keys(levels).find(l => levels[l].includes(node.id));
      const index = levels[level].indexOf(node.id);
      return {
        ...node,
        position: {
          x: parseInt(level) * gridSpacing,
          y: index * gridSpacing
        }
      };
    });

    console.log('New node positions:', newNodes.map(n => ({ id: n.id, position: n.position })));
    setNodes(newNodes);
    setIsLayouting(false);
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    console.log('DAGVisualization received initialNodes:', initialNodes);
    console.log('DAGVisualization received initialEdges:', initialEdges);
    if (initialNodes.length > 0 && initialNodes.every(node => node.position.x === 0 && node.position.y === 0)) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      layout();
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, layout]);

  const handleNodesChange = (changes) => {
    if (isLayouting) return;
    onNodesChange(changes);
    onNodesChangeParent(changes);
  };

  const handleEdgesChange = (changes) => {
    if (isLayouting) return;
    onEdgesChange(changes);
    onEdgesChangeParent(changes);
  };
  const nodeTypes = {
    default: (props) => <CustomNode {...props} onDeleteNode={onDeleteNode} />,
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default DAGVisualization;