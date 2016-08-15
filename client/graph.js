Template.policyGraph.events({
  "click .refresh-graph"(event) {
    console.log("click refresh")
    updatePolicyGraph()
  }
})
  
updatePolicyGraph = function() {
  
  var nodes = Nodes.find()
  var nodeConnections = NodeConnections.find()
  var elements = graphElements(nodes.fetch(), nodeConnections.fetch())
  console.log(elements)
  
  // assemble policy graph
  var cy = cytoscape({
    container: document.getElementById('cy'),
    zoomingEnabled: true,
    userZoomingEnabled: false,
    panningEnabled: true,
    userPanningEnabled: false,
    elements: elements,
    layout: {
      name: 'grid',
      fit: true
    },
    ready: function(){
      window.cy = this;
    },
    style: cytoscape.stylesheet()
      .selector('node')
        .css({
          'shape': 'circle',
          'background-color': '#fff',
          'border-color': 'data(color)',
          'border-style': 'solid',
          'border-width': '1.0',
          'width': '25',
          'height': '25',
          'text-valign': "top",
          'color': '#444',
          'text-margin-y': "-5",
          'font-family': "times",
          'font-weight': "100",
          'font-size': "18",
          'content': 'data(title)'
        })
      .selector('edge')
        .css({
            'curve-style': 'bezier',
            'width': '0.6',
            'target-arrow-shape': 'triangle',
            'line-color': 'data(color)',
            'source-arrow-color': '#000',
            'target-arrow-color': 'data(color)'
        })
  })  

}

graphElements = function(nodes, nodeConnections) {
  var elements = {nodes: [], edges: []}
  var color = "#000"
  nodes.sort(function(a, b) {
    num = function(a) {
      switch(a.type) {
        case "player": return 2;
        case "policy": return 1;
        case "goal": return 0;
      }
    }
    return num(a)-num(b)
  })  
  nodes.forEach(function(node) {
    elements.nodes.push({
      data: {
        id: node._id, 
        title: node.title,
        type: node.type,
        color: color
      }
    })
  })  
  nodeConnections.forEach(function(connection) {
    if(connection.bandwidth > 0) {
      var source = Nodes.findOne(connection.source)
      var target = Nodes.findOne(connection.target)
      elements.edges.push({
        data: {
          source: source._id,
          target: target._id,
          color: color
        }
      }) 
    } 
  })
  return elements
}