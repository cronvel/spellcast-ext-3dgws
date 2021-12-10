/*
	3D Ground With Sprites

	Copyright (c) 2020 - 2021 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const Button = require( './Button.js' ) ;

const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Choices( dom , gScene , choices , undecidedNames , onSelect , options = {} , parent = null ) {
	this.dom = dom ;    // Dom instance, immutable
	this.gScene = gScene ;
	this.parent = parent ?? this.gScene ;

	this.choices = choices ;
	this.undecidedNames = undecidedNames ;
	this.onSelect = onSelect ;

	//this.type = options.type ;
	//this.wait = options.wait || 0 ;

	this.buttons = this.choices.map( choice => new Button( this.dom , this.gScene , choice.label , {} , this ) ) ;

	this.guiCreates = false ;

	this.babylon = {
		containerStack: null
	} ;
}

module.exports = Choices ;



Choices.prototype.destroy = function() {
	this.buttons.forEach( button => button.destroy() ) ;
	if ( this.babylon.containerStack ) { this.babylon.containerStack.dispose() ; }
} ;



Choices.prototype.getUi = function() { return this.babylon.containerStack ; } ;



Choices.prototype.run = async function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }

	var choose = index => {
		console.warn( "Choice index:" , index ) ;
		this.onSelect( index ) ;
	} ;

	this.buttons.forEach( ( button , index ) => {
		button.run( () => choose( index ) ) ;
	} ) ;
} ;



const THEME = Choices.THEME = deepExtend( {} , Button.THEME , {
	default: {
		group: {
			spacing: 0.01
		} ,
		panel: {
			width: 0.2 ,
			height: "38px"
		} ,
		text: {
			color: "black" ,
			fontSize: "22px" ,
			outlineWidth: 2 ,
			outlineColor: "white"
		}
	}
} ) ;



Choices.prototype.createGUI = function( theme = this.dom.themeConfig?.choices?.default , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	var stack , spacing ,
		parentContainer = this.parent.getUi() ,
		parentSize = parentContainer.getSize() ;
	
	stack = this.babylon.containerStack = new BABYLON.GUI.StackPanel() ;
	spacing = theme?.group?.spacing ?? defaultTheme?.group?.spacing ?? 0 ;
	
	// Vertical stack (only one suppported ATM)
	stack.isVertical = true ;
	this.childrenWidthInPixelsRequired = false ;
	this.childrenHeightInPixelsRequired = true ;
	this.childrenMaxHeight = parentSize.height ;
	if ( typeof spacing === 'number' ) { spacing = Math.ceil( spacing * parentSize.height ) ; }
	stack.spacing = spacing ;

	parentContainer.addControl( stack ) ;

	this.buttons.forEach( button => {
		button.createGUI( theme , defaultTheme ) ;
	} ) ;

	this.guiCreated = true ;
} ;

