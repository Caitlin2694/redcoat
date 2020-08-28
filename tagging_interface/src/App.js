import React from 'react';
import logo from './favicon.png'
import './stylesheets/stylesheet.scss';
import {Component} from 'react';
import $ from 'jquery';
//const ReactDragListView = require('react-drag-listview');
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import styled from 'styled-components';
import _ from 'underscore';

// https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
function clearWindowSelection() {
  if (window.getSelection) {
    if (window.getSelection().empty) {  // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {  // Firefox
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {  // IE?
    document.selection.empty();
  }
}


// The navbar, which appears at the top of the page.
class Navbar extends Component {
  render() {
    return (
      <nav id="navbar">
        <div className="navbar-left">
          <div id="logo">
            <a href="/redcoat">
              <span className="inner">
                <span className="img">
                  <img src={logo}/>
                </span>
                <span>Redcoat</span>
              </span>
            </a>
          </div>
        </div>
        <div className="navbar-centre">Tagging Interface (WIP)</div>
        <div className="navbar-right">
          <div className="dropdown-menu short">
            <a href="features">v1.0</a>
          </div>
        </div>
      </nav>
    )
  }
}

// A single category in the category hierarchy tree.
class Category extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    var item = this.props.item;
    var index = this.props.index;
    var children = this.props.item.children;

    // If this component has any children, render each of them.
    if(children) {
      var childItems = (
        <ul className={this.props.open ? "" : "hidden"}>
          { children.map((item, index) => (
            <Category key={index}
                      item={item}
                      open={this.props.openedItems.has(item.full_name)}
                      openedItems={this.props.openedItems}
                      onClick={this.props.onClick}
                      hotkeyMap={this.props.hotkeyMap}
                      hotkeyChain={this.props.hotkeyChain}
                      isTopLevelCategory={false}
                      applyTag={this.props.applyTag}
            />)) }
        </ul>
      );
    } else {
      var childItems = '';
    }

    // Determine whether this category has a hotkey (by checking hotkeyMap).
    // Also determine hotkeyStr (for example '12' for 'item/pump').
    var hasHotkey = this.props.hotkeyMap.hasOwnProperty(this.props.item.full_name)
    var hotkeyStr = hasHotkey ? this.props.hotkeyMap[this.props.item.full_name].join('') : '';

    var content = (
      <span className="inner-container">
        
         {children && <span className="open-button" onClick={() => this.props.onClick(item.full_name)}><i className={"fa fa-chevron-" + (this.props.open ? "up" : "down")}></i></span>}
       
        <span className={"category-name" + (hasHotkey ? " has-hotkey" :"") + (this.props.hotkeyChain === hotkeyStr ? " hotkey-active" : "")}
              data-hotkey-id={hotkeyStr} onClick={() => this.props.applyTag(this.props.item.full_name)}>             

          {item.name}
        </span>
      </span>      
    )


    // This component will render differently depending on whether it is a top-level category or not.
    // Top level categories have the drag handle, which requires a different configuration on the wrapper and li.
    if(this.props.isTopLevelCategory) {
      return (
        <Draggable key={item.id.toString()} draggableId={item.id.toString()} index={index}>
          {(provided, snapshot) => (
            <li ref={provided.innerRef} {...provided.draggableProps} className={"draggable " + (snapshot.isDragging ? "dragging": "not-dragging") + " color-" + (item.colorId + 1)}>
              <div {...provided.dragHandleProps} className="drag-handle-container"><span className="drag-handle"></span></div>
              
              { content }
              { childItems }
              
            </li>
          )}
        </Draggable>
      )
    } else {
      return (
        <li>
          { content }
          { childItems }
        </li>
      )
    }
  }
}



// https://codesandbox.io/s/k260nyxq9v?file=/index.js:154-2795
// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};


// Retrieve a list of ordered items based on an order array.
function getOrderedItems(items, order) {
  var orderedItems = new Array(items.length);
  for(var i = 0; i < order.length; i++) {
    orderedItems[i] = items[order[i]];
  }
  return orderedItems;
}

// The category hierarchy (on the left).
class CategoryHierarchy extends Component {
  constructor(props) {
    super(props);
    this.state = {
      itemOrder: [],      // An array that maintains the ordering of the top-level categories.
                          // e.g. [0, 1, 3, 2]
      orderedItems: [],
      openedItems: new Set(),    // An set keep track of the items that have been open (indexed by name).
    }
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  // When this component's items changes (should be when a new docGroup has been requested), setup a new itemOrder state.
  // (which defaults to ascending order e.g. 0, 1, 2, 3, 4 ...)
  componentDidUpdate(prevProps, prevState) {
    var t = this;
    function setupItemOrder() {
      var itemOrder = new Array(t.props.items.length);
      for(var i = 0; i < itemOrder.length; i++) {
        itemOrder[i] = i;
      }
      return itemOrder;
    }
    
    var itemOrder = setupItemOrder();
    if(!_.isEqual(prevProps.items, this.props.items)) {
      this.setState({
        openedItems: new Set(),
        orderedItems: this.props.items,
        itemOrder: itemOrder,
      });
    }
  }

  // Open or close a category.
  // It's pretty awkward that this function is necessary. It would be ideal to store 'open' as a state variable inside the Category and Subcategory
  // components, but that results in the wrong categories being open when the top-level categories are moved around.
  // Storing them in the openedItems array in this component's state allows for the opened categories to be maintained when the user
  // drags a category from one place to another.
  // full_name should be the full name of the category, e.g. item/pump/centrifugal_pump, which are unique.
  toggleCategory(full_name) {
    var openedItems = this.state.openedItems;    

    if(openedItems.has(full_name)) {
      openedItems.delete(full_name);
    } else {
      openedItems.add(full_name);
    }

    this.setState({
      openedItems: openedItems
    })
  }

  // When the user has finished dragging a category, determine the new item order and save this order to the state.
  onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const itemOrder = reorder(
      this.state.itemOrder,
      result.source.index,
      result.destination.index
    );

    var orderedItems = getOrderedItems(this.props.items, itemOrder)

    this.props.initHotkeyMap(orderedItems, () =>
      this.setState({
        itemOrder: itemOrder,
        orderedItems: orderedItems,
      })
    );
  }

  
  render() {

    var items       = this.state.orderedItems;
    var openedItems = this.state.openedItems;

    return (
      <div id="category-hierarchy-tree">
        <DragDropContext onDragEnd={this.onDragEnd}>
          <Droppable droppableId="droppable">
            {(provided, snapshot) => (
              <ul
                {...provided.droppableProps}
                className={"draggable-list" + (snapshot.isDraggingOver ? " dragging" : "")}
                ref={provided.innerRef}

              >
                {items.map((item, index) => (
                  <Category 
                            key={index}
                            item={item}
                            index={index}
                            onClick={this.toggleCategory.bind(this)}
                            open={openedItems.has(item.name)} 
                            openedItems={this.state.openedItems} 
                            hotkeyMap={this.props.hotkeyMap}
                            hotkeyChain={this.props.hotkeyChain}
                            isTopLevelCategory={true}
                            applyTag={this.props.applyTag}
                  />
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }
}


// A single word (or token) in the tagging interface.
class Word extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
    }
  }

  render() {
    return (
      <span className={"word" + (this.props.selected ? " selected" : "")}
        onMouseDown={() => this.props.updateSelections(this.props.index, 'down')}
        onMouseUp=  {() => this.props.updateSelections(this.props.index, 'up')}>
        <span className="word-inner">
          {this.props.text}
        </span>
      </span>
    );
  }
}


// A sentence in the tagging interface.
class Sentence extends Component {
  constructor(props) {
    super(props);
  }

  // wordMouseDown(index, word) {
  //   console.log("mouse down:", word, index);
  //   this.setState({
  //     selectionEnd: -1,
  //     selectionStart: index
  //   }, () => this.props.updateSelectedSentence(this.props.index));
  //   // }, () => {
  //   //   window.addEventListener('mouseup', () => {
  //   //     this.setState({
  //   //       selectionStart: -1,
  //   //       selectionEnd: -1,
  //   //     })
  //   //   })
  //   // })
  // }

  // wordMouseUp(index, word) {
  //   console.log("mouse up:", word, index);
  //   clearWindowSelection();
  //   this.setState({
  //     selectionEnd: index
  //   }, () => {    
  //     this.props.updateSelectedSentence(this.props.index)  
  //     console.log(this.state.selectionStart, this.state.selectionEnd, '<<<')
  //   });

  // }



  // Call the updateSelections function of the parent of this component (i.e. TaggingInterface), with this sentence's index included.
  updateSelections(wordIndex, action) {
    this.props.updateSelections(this.props.index, wordIndex, action)
  }



  render() {

    var selections = this.props.selections;

    // Check props.selections to determine whether the word with a given index in this sentence is selected.
    function isWordSelected(wordIndex) {      
      if(selections.length === 0) return false;     
      for(var i = 0; i < selections.length; i++) {
        var selection = selections[i];
        if(selection.wordEndIndex < 0) continue;
        if(selection.wordEndIndex >= wordIndex && wordIndex >= selection.wordStartIndex ) {
          return true;
        }
      }
      return false;
    }

    return (
      <div className="sentence" data-ind={this.props.index} data-ind1={this.props.index + 1}>
        { this.props.words.map((word, i) => 
          <Word key={i}
                index={i}
                text={word}
                selected={isWordSelected(i)}
                updateSelections={this.updateSelections.bind(this)}
                //wordMouseUp={this.props.updateSelection.bind(this)}
          />)
        }
        
      </div>
    );
  }

}


// A simple function for traversing a list of nodes. Goes with the function below.
// Both functions found on StackOverflow: https://stackoverflow.com/questions/7781963/js-get-array-of-all-selected-nodes-in-contenteditable-div
function nextNode(node) {
    if (node.hasChildNodes()) {
        return node.firstChild;
    } else {
        while (node && !node.nextSibling) {
            node = node.parentNode;
        }
        if (!node) {
            return null;
        }
        return node.nextSibling;
    }
}

// A function for traversing the nodes present in the range object, which allows us to determine all html nodes
// corresponding to selected items (items in which part of them are highlighted).
// Note that you can't see the highlighted text on the screen because it has been hidden by css.
function getRangeSelectedNodes(range) {
    var node = range.startContainer;
    var endNode = range.endContainer;

    // Special case for a range that is contained within a single node
    if (node == endNode) {
        return [node.parentNode];
    }


    // Iterate nodes until we hit the end container
    var rangeNodes = [];
    while (node && node != endNode) {
        rangeNodes.push( node = nextNode(node) );
    }

    // Add partially selected nodes at the start of the range
    node = range.startContainer;
    while (node && node != range.commonAncestorContainer) {
        rangeNodes.unshift(node);
        node = node.parentNode;
    }

    return rangeNodes;
}



// A simple class for displaying information related to the hotkeys the user is currently pressing.
class HotkeyInfo extends Component {
  constructor(props) {
    super(props);
  }

  render() {

    var ec = this.props.entityClass;
    if(ec === undefined) {
      ec = '(not a valid class)';
    }

    return (
      <div className={"hotkey-info" + (this.props.chain.length === 0 ? " hidden": "")}>
        <span className="chain">{this.props.chain}</span>: <span>{ec}</span>
      </div>
    )

  }
}


// A super simple class to store an annotation for a single token.
// Properties:
/* bioTag ('B', 'I' or 'O')
   entityClasses (e.g. ['Item', 'Item/Pump'])
   token: the token e.g. 'centrifugal'
   spanText: the text of the span that this annotation is within (e.g. 'centrifugal pump')
   spanStartIdx: the start index of the span this annotation is in, i.e. 0 for the first word in the sentence
   spanEndIdx: the end index as above
*/
class Annotation {
  constructor(token) {
    this.token = token;
    this.bioTag = "O";    
  }

  // Adds the specified label to this annotation.
  // bioTag: The bioTag, e.g. "B" or "I",
  // entityClass: The entity class, e.g. "Item/Pump"
  // text: The text of the span that this annotation is inside, e.g. "centrifugal pump".
  // spanStartIdx, spanEndIdx: self explanatory (as above)
  // nextAnnotation: The Annotation object for the next token in the sentence.
  addLabel(bioTag, entityClass, spanText, spanStartIdx, spanEndIdx, nextAnnotation = null) {
    this.bioTag = bioTag;
    if(this.entityClasses === undefined) this.entityClasses = new Array();

    // If the label was already on this token, don't do anything.
    if(this.entityClasses.indexOf(entityClass) > -1) {
      return;
    }

    // Add the entityClass to the entityClass array for object.
    this.entityClasses.push(entityClass);
    
    // If the nextAnnotation is from the same mention (AKA span) as this one, and does not have exactly the same labels,
    // change its BIO tag to B.
    if(nextAnnotation) {
      if(this.sameMention(nextAnnotation) && !this.sameEntityClasses(nextAnnotation)) {
        console.log("Changing bio tag of next annotation to B")
        nextAnnotation.changeBioTag("B");
      }
    }

    // Adjust the span.      
    this.spanText = spanText;
    this.spanStartIdx = spanStartIdx;
    this.spanEndIdx = spanEndIdx;
  }

  // Simple function to determine whether this annotation is in the same mention as another annotation.
  sameMention(otherAnnotation) {
    return otherAnnotation.spanStartIdx === this.spanStartIdx && otherAnnotation.spanEndIdx === this.spanEndIdx && otherAnnotation.spanText === this.spanText;
  }

  sameEntityClasses(otherAnnotation) {

    return _.isEqual(this.entityClasses, otherAnnotation.entityClasses);
  }

  // Removes a label from this annotation.
  // If it was the last label, reset this annotation's bioTag to "O" and delete the entityClasses and text properties.
  removeLabel(entityClass) {
    var index = this.entityClasses.indexOf(entityClass);
    if(index === -1) {
      console.log("Warning: tried to remove an entity class from an annotation that did not exist.")
      return;
    }
    this.entityClasses.splice(index, 1);
    if(this.entityClasses.length === 0) {
      this.bioTag = "O";
      delete this.entityClasses;
      delete this.spanText;
    }
  }

  // Change the bio tag of this annotation to another bio tag.
  changeBioTag(bioTag) {
    this.bioTag = bioTag;
  }

  // Prints this annotation nicely to the console (for debugging).
  prettyPrint() {
    console.log("Token:    ", this.token);
    console.log("BIO Tag:  ", this.bioTag)
    console.log("Span:     ", this.spanText)
    console.log("StartIdx: ", this.spanStartIdx)
    console.log("EndIdx: ", this.spanEndIdx)
    console.log("Classes:  \n", this.entityClasses);
    console.log('\n');
  }
}

// A debug printing function for printing out a list of annotations for a document.
function prettyPrintAnnotations(documentAnnotations) {
  console.log("Annotations:\n")
  console.log("=====================")  
  for(var token_idx in documentAnnotations) {
    documentAnnotations[token_idx].prettyPrint();
  }
}


// The TaggingInterface class. Contains the vast majority of the logic for the interface.
class TaggingInterface extends Component {
  constructor(props) {
    super(props);
    this.state = {
      project_id: 'RtJp98vxk', // debug

      // Data (from the server)
      data: {
        documentGroup: [],
        categoryHierarchy: {'children': []}
      },

      // Annotations array
      annotations: [],  // Stores the user's annotations.

      // Selections
      selections: this.getEmptySelectionsArray(10),       // The selections is an array containing a sub-array for each document,
                                                          // which in turn hold all of the current selections made by the user for that
                                                          // document.
      currentSelection: this.getEmptyCurrentSelection(),  // The current selection is for when the user clicks a word and is in the process
                                                          // of selecting an end word. 
      // Hotkeys
      hotkeyMap: {},  // Stores a mapping of hotkey to number, e.g. 'item/pump': '11'.
      reverseHotkeyMap: {}, // Stores the reverse of the above (number to hotkey), e.g. '11': 'item/pump'.
      hotkeyChain: [], // Stores the current hotkey chain, e.g. [1, 2, 3] = the user has pressed 1, then 2, then 3 in quick succession
      hotkeyBindingFn: null,  // Stores the function that gets called via an eventlistener when a hotkey is pressed. Must be stored as a state
                              // variable so that it can be detached when the hotkeys change.
      hotkeyTimeoutFn: null,   // Stores the current hotkey timeout function.

      // Key events
      holdingCtrl: false, // Whether the user is currently holding the ctrl key.
      holdingShift: false, // Whether the user is currently holding the shift key.


    }    
  }

  /* Mouse and keyboard events */

  // Set up some mouse events - one for when text is selected (highlighted) in the browser.
  // Note that in order to see the default browser highlighting the CSS file needs to be modified (it makes it invisible).
  // Another for when the user releases the mouse anywhere on the page.
  // Note that the majority of the mouse events are not in this function but are passed down to the Word elements via updateSelections.
  initMouseEvents() {

    var words = $('.word-inner')

    // When the user highlights text anywhere on the page, this function captures the event.
    // If the user never selected a word to begin with, nothing happens.
    // All it does is apply the 'highlighted' class onto any words that were caught in the highlighting.
    // This function is purely stylistic, i.e. it doesn't affect any other components etc.
    document.addEventListener("selectionchange", event =>{
      if(this.state.currentSelection.wordStartIndex < 0) {
        return;
      }
      var sel = window.getSelection && window.getSelection();

      if (sel && sel.rangeCount > 0) {
        var r =  getRangeSelectedNodes(sel.getRangeAt(0));        
        words.removeClass('highlighted');
        $(r).addClass('highlighted');          
      }
    })

    // When the user releases the mouse, remove all highlighting from words (i.e. the words in the selection).
    // If the user never selected a word to begin with (i.e. wordStartIndex < 0), clear all selections.
    window.addEventListener('mouseup', (e) => {
      words.removeClass('highlighted');
      if(this.state.currentSelection.wordStartIndex < 0) {
        clearWindowSelection();
        return;
      }
      if(!e.target.classList.contains('word-inner')) { // Ensure that the user is not hovering over a word            
        var sentenceIndex = this.state.currentSelection.sentenceIndex;
        this.updateSelections(sentenceIndex, this.state.data.documentGroup[sentenceIndex].length - 1, 'up');
      }        
    });
  }

  // Set up the key binds (ctrl, shift, left right up down etc).
  // This function does not set up the hotkeys (that is done via setupHotkeyKeybinds)
  initKeybinds() {

    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'Shift':       if(!this.state.holdingShift) this.setState({ holdingShift: true }); break;
        case 'Control':     if(!this.state.holdingCtrl) this.setState({ holdingCtrl: true }); break;

        // For the arrows, call e.preventDefault() to prevent the window from scrolling
        case 'ArrowLeft':   e.preventDefault(); this.moveSelectionHorizontally('left'); break; 
        case 'ArrowUp':     e.preventDefault(); this.moveSelectionVertically('up'); break;
        case 'ArrowRight':  e.preventDefault(); this.moveSelectionHorizontally('right'); break;
        case 'ArrowDown':   e.preventDefault(); this.moveSelectionVertically('down'); break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch(e.key) {
        case 'Shift':   if(this.state.holdingShift) this.setState({ holdingShift: false }); break;
        case 'Control': if(this.state.holdingCtrl) this.setState({ holdingCtrl: false }); break;
      }      
    });
  }



  /* Hotkey functions */

  // When the user has pressed a hotkey that is not quickly followed up with another hotkey, this function is called.
  // Apply the corresponding entity class and reset the hotkey chain.
  hotkeyTimeout() {
    var hotkeyChainStr = this.state.hotkeyChain.join('');
    var entityClass = this.state.reverseHotkeyMap[hotkeyChainStr];
    if(entityClass !== undefined) this.applyTag(entityClass);

    // Clear the existing hotkey timeout fn.
    window.clearTimeout(this.state.hotkeyTimeoutFn);
    this.setState({
      hotkeyTimeoutFn: null,      
      hotkeyChain: [],
    })
  }

  // This function is called when a hotkey is pressed.
  // If a hotkey was pressed previously within 333ms, the chain will grow until the point the user no longer presses a hotkey
  // for 333ms.
  bindHotkeys(e, hotkeyMap) {
    if(e.keyCode < 49 || e.keyCode > 57) return; // Hotkeys are in the range 1-9, which are keyCode 49-57.
    var key = e.keyCode - 48;

    // Update the hotkey chain to include the key that was pressed
    var hotkeyChain = Array.prototype.concat(this.state.hotkeyChain, key);
    this.setState({
      hotkeyChain: hotkeyChain
    }, () => {
      // Remove the previous timeout and set up a new one
      window.clearTimeout(this.state.hotkeyTimeoutFn);      
      var hotkeyTimeoutFn = window.setTimeout(() => this.hotkeyTimeout(), 333);

      this.setState({
        hotkeyTimeoutFn: hotkeyTimeoutFn
      });
    });
  }

  // Assign keybinds to each of the hotkeys in the hotkey map.
  setupHotkeyKeybinds() {
    
    console.log("Setting up hotkey keybinds...")

    // Clear the current hotkey binding function and set up a new one.
    document.removeEventListener('keydown', this.state.hotkeyBindingFn);
    var hotkeyBindingFn = (e) => this.bindHotkeys(e, this.state.hotkeyMap);

    document.addEventListener('keydown', hotkeyBindingFn);

    // Store the binding function in this.state so that it can be removed in subsequent calls of this function.
    this.setState({
      hotkeyBindingFn: hotkeyBindingFn,
    });
  }

  // Builds the hotkey map according to the ordered category hierarchy, and saves it to this component's state.
  // The hotkey map will change whenever the user changes the order of them items via drag and drop.
  initHotkeyMap(orderedItems, next) {

    console.log("Setting up hotkey map...")
    // Annoying that the following is a recursive function but I think it's the only way to do it.
    // The result is a hotkeyMap as follows:
    /*  {
          'item': [1],
          'item/pump': [1, 1],
          'item/pump/centrifugal_pump': [1, 1, 1],
          'item/pump/big_pump': [1, 1, 2],
          'item/compressor': [1, 2],
          'activity': [2]
        }
    */
    function traverseChild(child, index, hotkeyMap, hotkeys, firstPass) {
      if(!firstPass) {
        hotkeyMap[child.full_name] = hotkeys;
      }
      if(child.children) {
        for(var i = 0; i < Math.min(9, child.children.length); i++) { // Don't go past index 9 so that the hotkeys make sense
          traverseChild(child.children[i], i + 1, hotkeyMap, Array.prototype.concat(hotkeys, i + 1));
        }
      }
      return hotkeyMap;          
    }    

    // Build the reverse of the hotkeyMap, i.e. swap the keys with the values.
    // This assists with the hotkey bindings function.
    function buildReverseHotkeyMap(hotkeyMap) {
      var reverseHotkeyMap = {};
      for(var key in hotkeyMap){
        var val = hotkeyMap[key].join('');
        reverseHotkeyMap[val] = key;
      }
      return reverseHotkeyMap;    
    }


    var hotkeyMap = traverseChild({children: orderedItems}, 1, [], [], true);
    var reverseHotkeyMap = buildReverseHotkeyMap(hotkeyMap);

    // Once the hotkeyMap (and reverseHotkeyMap) has been created, set up the hotkey keybinds and call the callback fn.
    this.setState({
      hotkeyMap: hotkeyMap,
      reverseHotkeyMap: reverseHotkeyMap
    }, () => { this.setupHotkeyKeybinds(); if(next) next(); });
  }


  // Sets up an array to store the annotations with the same length as docGroup.
  // Prepopulate the annotations array with the automaticAnnotations if available (after converting them to BIO).
  initAnnotationsArray(documents, automaticAnnotations) {
    var annotations = new Array(documents.length);
    for(var doc_idx in documents) {
      annotations[doc_idx] = new Array(documents[doc_idx].length);
      for(var token_idx in documents[doc_idx]) {
        annotations[doc_idx][token_idx] = new Annotation(documents[doc_idx][token_idx]);
      }
    }

    if(!automaticAnnotations) return annotations;

    // Load annotations from the automaticAnnotations array if present.
    for(var doc_idx in automaticAnnotations) {
      for(var mention_idx in automaticAnnotations[doc_idx]) {

        var mention = automaticAnnotations[doc_idx][mention_idx];
        var start = mention['start'];
        var end = mention['end'];

        for(var label_idx in mention['labels']) {
          var label = mention['labels'][label_idx];

          for(var k = start; k < end; k++) {
            var bioTag = k === start ? 'B' : "I";
            annotations[doc_idx][k].addLabel(bioTag, label, documents[doc_idx].slice(start, end).join(' '), start, end)
          }          
        }
      }        
    }
    return annotations;
  }

  /* Miscellaneous */

  // Justify the words to the nearest 25px (i.e. round their width up to the nearest 25px).
  // Not really necessary but makes the diagonal stripey lines line up properly when multiple tokens are selected.
  // I spent about 2 hours trying to figure out how to get the stripey lines to line up properly, this is the result :D
  justifyWords() {
    $('.word-inner').each((i, ele) => {
      var width = ele.offsetWidth;
      var newWidth = Math.ceil(width / 25) * 25;
      $(ele).css('min-width', newWidth + 'px');
    });
  }

  /* Mounting function */

  // When this component is mounted, call the API.
  // Set up the keybinds and mouseup event when done.
  componentWillMount() {

    const fetchConfig = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

    var pid = 'RtJp98vxk'; // TODO: Determine pid via URL

    fetch('http://localhost:3000/projects/' + pid + '/tagging/getDocumentGroup', fetchConfig) // TODO: move localhost out
      .then(response => response.text())
      .then((data) => {         
        var d = JSON.parse(data);
        this.setState(
          {
            data: d,
            annotations: this.initAnnotationsArray(d.documentGroup, d.automaticAnnotations),
            selections: this.getEmptySelectionsArray(d.documentGroup.length)
          }, () => { 
            console.log("Data:", this.state.data);
            this.initKeybinds();
            this.initMouseEvents();
            this.initHotkeyMap(this.state.data.categoryHierarchy.children);
            this.justifyWords();
          })
      });
  }  

  /* Selection functions */

  // Get an empty current selection.
  // Called when we need to clear the current selection.
  getEmptyCurrentSelection() {
    return {
      wordStartIndex: -1,
      wordEndIndex: -1,
      sentenceIndex: -1
    }
  }

  // Move the selection up or down.
  // This function should be called when one of those keys is pressed.
  moveSelectionVertically(direction) {
    console.log("Moving", direction) // TODO: Make this move up and down
  }

  // Move the selection in the specified direction ('left', 'right').
  // This function should be called when one of those keys is pressed.
  moveSelectionHorizontally(direction) {
    console.log("Moving", direction)

    var selections = this.state.selections;

    // Move left or right
    for(var i = 0; i < selections.length; i++) {
      for(var j = 0; j < selections[i].length; j++) {
        var selection = selections[i][j];

        // Behaviour depends on whether shift is currently being held down.
        if(direction === "left") {
          if(!this.state.holdingShift) {
            selection.wordStartIndex = Math.max(selection.wordStartIndex - 1, 0);
            selection.wordEndIndex = selection.wordStartIndex;
          } else { // If shift is being held down, move the wordEndIndex backwards or move the wordStartIndex backwards depending on the current selection.
            if(selection.wordEndIndex > selection.wordStartIndex) {
              selection.wordEndIndex--;
            } else {
              selection.wordStartIndex = Math.max(selection.wordStartIndex - 1, 0);
            }
          }
        } else if (direction === "right") {
          if(!this.state.holdingShift) { // If shift *is* being held down, this won't happen (the wordStartIndex won't change).
            selection.wordStartIndex = Math.min(this.state.data.documentGroup[i].length - 1, selection.wordEndIndex + 1);
          }
          selection.wordEndIndex   = Math.min(this.state.data.documentGroup[i].length - 1, selection.wordEndIndex + 1);
        }
      }
    }
    this.setState({
      selections: selections
    });
  }

  // Get an empty selections array whose length is the number of docs in this documentGroup.
  getEmptySelectionsArray(numDocs) {
    if(!numDocs) {
      var numDocs = this.state.data.documentGroup.length;
    }
    var selections = new Array(numDocs);
    for(var i = 0; i < selections.length; i++) {
      selections[i] = new Array();
    }
    return selections;
  }

  

  // Clear all active selections by resetting the selections array.
  clearSelections() {
    this.setState( {
      currentSelection: this.getEmptyCurrentSelection(),
      selections: this.getEmptySelectionsArray()
    });
  }

  // Update this component's selections state.
  // This function is called via the mouse, and has no relation to the keyboard (keyboard selections are handled above).
  // sentenceIndex: The index of the sentence in which the selection was made.
  // wordIndex: the index of the word that was clicked on, or hovered over and the mouse released.
  // action: Whether the mouse was pressed down ('down') or released ('up').
  updateSelections(sentenceIndex, wordIndex, action) {
    var wordStartIndex, wordEndIndex;

    var selections = this.state.selections;
    var currentSelection = this.state.currentSelection;

    if (action === "down") { // Mouse down, i.e. a word was clicked.

      if(!this.state.holdingCtrl) {
        selections = this.getEmptySelectionsArray(); // Reset all selections upon clicking a word, unless Ctrl is being held.
      }
      wordStartIndex = wordIndex;
      wordEndIndex = -1;

      currentSelection = {
        sentenceIndex: sentenceIndex,
        wordStartIndex: wordStartIndex,
        wordEndIndex: wordEndIndex
      }      

    } else if(action === "up") { // Mouse up, i.e. mouse was released when hovering over a word.

      // Only allow selections where the user has clicked on a starting word.
      if(currentSelection.wordStartIndex === -1) {
        this.clearSelections();
        return;
      }

      wordStartIndex = currentSelection.wordStartIndex;

      // If the first word selected was in a different sentence, the wordStartIndex becomes the start of the sentence where the mouse was released.
      if(currentSelection.sentenceIndex !== sentenceIndex) {  // TODO: Make this consider mouseX relative to the X of the initial token?
        wordStartIndex = 0;
      };

      wordEndIndex = wordIndex;

      // If the second word selected was before the first, swapperino them around (so that backwards selections work as expected).
      if(wordIndex < wordStartIndex) {
        var s = wordStartIndex;
        wordStartIndex = wordIndex;
        wordEndIndex = s;
      }     

      currentSelection = this.getEmptyCurrentSelection();
      selections[sentenceIndex].push({
        wordStartIndex: wordStartIndex,
        wordEndIndex: wordEndIndex
      });

      clearWindowSelection(); // Remove the default browser selection highlighty thing.
    }    

    this.setState({
      currentSelection: currentSelection,
      selections: selections
    });
  }




  /* Tag application function */

  // Apply a specific tag to all current selections.
  // entityClass: The full name of the entity class, e.g. 'item/pump/centrifugal_pump'.
  // This function can be either called via clicking on an entity class in the tree, or by using hotkeys.
  applyTag(entityClass) {    
    console.log("Applying tag:", entityClass);
    var selections = this.state.selections;
    var documents = this.state.data.documentGroup;
    var annotations = this.state.annotations;

    for(var doc_idx in selections) {
      for(var sel_idx in selections[doc_idx]) {
        var sel = selections[doc_idx][sel_idx];
        var start = sel.wordStartIndex;
        var end = sel.wordEndIndex;

        for(var k = end; k >= start; k--) { // Going backwards is the only way to get the annotations to apply correctly, due to the nature of BIO
          var bioTag = k === start ? "B" : "I";
          var spanText = documents[doc_idx].slice(start, end + 1).join(' ');
          var nextAnnotation = k < (documents[doc_idx].length - 1) ? annotations[doc_idx][k + 1] : null;
          annotations[doc_idx][k].addLabel(bioTag, entityClass, spanText, start, end, nextAnnotation);
        }
      }
    }
    this.setState({
      annotations: annotations,
    }, () => {
      prettyPrintAnnotations(this.state.annotations[0]);
      //console.log("Updated annotations[0]:", this.state.annotations[0]);
    })

  }

  /* Rendering function */

  render() {

    return (
      <div id="tagging-interface">
        <div id="tagging-container">
          <div id="sentence-tagging">
            { this.state.data.documentGroup.map((doc, i) => 
              <Sentence 
                key={i}
                index={i}
                words={doc}                
                selections={this.state.selections[i]}
                updateSelections={this.updateSelections.bind(this)}
            />)}
          </div>
        </div>
        <div id="tagging-menu">
          <div className="category-hierarchy">
            <div className="tokens-info">Wikipedia placeholder</div>
            <HotkeyInfo 
              chain={this.state.hotkeyChain}
              entityclassName={this.state.reverseHotkeyMap[this.state.hotkeyChain.join('')]}
            />            
            
            <CategoryHierarchy
              items={this.state.data.categoryHierarchy.children}
              hotkeyMap={this.state.hotkeyMap}
              hotkeyChain={this.state.hotkeyChain.join('')}
              initHotkeyMap={this.initHotkeyMap.bind(this)}
              applyTag={this.applyTag.bind(this)}
            />
          </div>
          
        </div>
      </div>
    )
  }
}


// The app, which renders the navbar and the tagging interface inside a container.
function App() {
  return (
    <div id="app">
      <Navbar/>  
      <TaggingInterface/>
    </div>
  );
}

export default App;
