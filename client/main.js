import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

importJson = function(raw) {
  var jsonObject;
  var err;

  try {
    jsonObject = $.parseJSON(raw) 
    console.log(jsonObject)
  } catch(err) {
    if(err) {
      console.log(err.message)
      return false
    }
  } 

  Meteor.call("json.import", jsonObject)
  return true
}

Template.body.helpers({
  goalsSorted() { return Nodes.find({state: "active", type: "goal"}, {sort: { level: -1 }}) },
  policiesSorted() { return Nodes.find({state: "active", type: "policy"}, {sort: { level: -1 }}) },
  goals() { return Nodes.find({state: "active", type: "goal"}) },
  policies() { return Nodes.find({state: "active", type: "policy"}) },
  players() { return Nodes.find({state: "active", type: "player"}) },
  simulationRunning() {
    var state = SimulationState.findOne()
    if(state) {
      return state.running
    } else {
      return false
    }
  },
  simulationSpeed() {
    var state = SimulationState.findOne()
    if(state) {
      return state.speed
    } else {
      return false
    }
  },
  adminView() { return Session.get("adminView") },
  snapshots() { return Snapshots.find({}) },
  optionSelected() { return this.name == Session.get("snapshotSelected") ? "selected" : "" },
  snapshotSelected() { return Session.get("snapshotSelected") }
      
})

Template.body.events({
  "click .simulation-toggle"(event) {
    Meteor.call("simulation.toggle")
  },
  "click .simulation-step"(event) {
    Meteor.call("simulation.step")
  },
  "input .simulation-speed"(event) {
    var state = SimulationState.findOne()
    if(state) {
      SimulationState.update(state._id, {$set: {speed:Number(event.target.value)}})
    } 
  },
  "click .create-goal"(event) {    
    Meteor.call("nodes.create", "goal", updatePolicyGraph)
  },
  "click .create-policy"(event) {    
    Meteor.call("nodes.create", "policy", updatePolicyGraph)
  },
  "click .create-player"(event) {    
    Meteor.call("nodes.create", "player", updatePolicyGraph)
  },
  "click .toggle-admin-view"(event) {
    if(Session.get("adminView")) {
      Session.set("adminView", false)
    } else {
      Session.set("adminView", true)
    }
  },
  "click .refresh-graph"(event) {
    updatePolicyGraph()
  },
  "click .take-snapshot"(event) {
    var name = prompt("name you snapshot")
    if(name) {
      Meteor.call("snapshots.create", name, function() {
        Session.set("snapshotSelected", name)
      })
    }
  },
  "change .load-snapshot"(event, template) {
    if(event.target.value != "load") {
      if(confirm("caution: when reverting to a snapshot you lose the current simulation state. proceed?")) {
        Meteor.call("snapshots.load", event.target.value, function() {
          updatePolicyGraph()
          Session.set("snapshotSelected", event.target.value == "empty" ? null : event.target.value)
        })
      } 
    }
  },
  "click .delete-snapshot"(event) {
    if(confirm("delete snapshot " + Session.get("snapshotSelected") + "?")) {
      Meteor.call("snapshots.delete", Session.get("snapshotSelected"), function() {
        Session.set("snapshotSelected", null)
      })
    }
  },
  "click .export-json"(event) {
    $("#jsonOutput").html("<h2>JSON</h2><p>" + exportJson() + "</p>")
  },
  "click .json-import"(event) {
    if(confirm("import json data and replace current graph?")) {
      if(importJson($(".json-import-data").val())) {
        alert("sucess")
      } else {
        alert("import error")
      }
    }
  }
})

Template.body.rendered = function() {
  Meteor.setTimeout(function() {
    updatePolicyGraph()    
  }, 2000)
}

Template.policyShort.helpers({
  effective() {
    return this.level >= this.threshold
  },
  overflow() {
    return (this.level >= this.overflow) && (this.overflow > 0)
  }
})

Template.node.helpers({
  goal() {
    return this.type == "goal"
  },
  policy() {
    return this.type == "policy"
  },
  player() {
    return this.type == "player"
  },
  replenish() {
    return -this.decay
  },
  connections() {
    return NodeConnections.find({source: this._id})
  },
  showConnections() {
    return NodeConnections.find({source: this._id}).count() > 0
  },
  adminView() { return Session.get("adminView") }
  
})

Template.node.events({
  "change input"(event) {
    if(event.target.name == "replenish") {
      this["decay"] = -Number(event.target.value) // call negative decay "replenish" for player nodes
    } else {
      if($(event.target).hasClass("number")) {
        this[event.target.name] = Number(event.target.value) // convert input to number
      } else {
        this[event.target.name] = event.target.value
      }      
    }
    Nodes.update(this._id, this)
  },
  "click .delete-node"(event) {
    if(confirm("permanently delete node?")) {
      Meteor.call("nodes.delete", this._id, updatePolicyGraph)
    }
  }
})

Template.connection.helpers({
  targetTitle() {
    var node = Nodes.findOne(this.target)
    if(node) {
      return Nodes.findOne(this.target).title
    }
  },
  addPossible() {
    var maxBandwidth = 100
    var totalBandwidth = 0
    NodeConnections.find({source: this.source}).fetch().forEach(function(connection) {
      totalBandwidth += connection.bandwidth
    })
    return totalBandwidth < maxBandwidth
  },
  subPossible() {
    return this.bandwidth > 0 
  },

})

Template.connection.events({
  "change input"(event) {
    var newValue = Number(event.target.value)
    var oldValue = this[event.target.name]
    this[event.target.name] = newValue
    NodeConnections.update(this._id, this)
    if(event.target.name == "bandwidth") {
      if(oldValue == 0 || newValue == 0) {
        updatePolicyGraph()
      }
    }
  },
  "click .plus-water"(event, template) {
    this.bandwidth += 1
    NodeConnections.update(this._id, this)
    if(this.bandwidth == 1) {
      updatePolicyGraph()
    }
  },
  "click .minus-water"(event, template) {
    if(this.bandwidth >= 1) {
      this.bandwidth -= 1
      NodeConnections.update(this._id, this)
      if(this.bandwidth == 0) {
        updatePolicyGraph()
      }
    }
  }
  

})
  
  
  