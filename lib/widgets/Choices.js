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

const misc = require( '../misc.js' ) ;

const extension = require( '../browser-extension.js' ) ;

const Control = BABYLON.GUI.Control ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Choices( dom , gScene , choices , undecidedNames , onSelect , options = {} , parent = null ) {
	this.dom = dom ;    // Dom instance, immutable
	this.gScene = gScene ;
	this.parent = parent ?? this.gScene ;

	this.choices = choices ;
	this.undecidedNames = undecidedNames ;
	this.onSelect = onSelect ;

	// This is the index of the button that would be highlighted by key/gamepad up/down
	this.keyFocusIndex = 0 ;
	
	this.position = options.nextStyle.position ;

	this.buttons = this.choices.map( choice => new Button( this.dom , this.gScene , choice.label , {} , this ) ) ;

	this.guiCreates = false ;

	this.babylon = {
		containerStack: null ,
		focusImage: null
	} ;
}

module.exports = Choices ;



Choices.prototype.destroy = function() {
	this.buttons.forEach( button => button.destroy() ) ;
	if ( this.babylon.containerStack ) { this.babylon.containerStack.dispose() ; }
	if ( this.babylon.focusImage ) { this.babylon.focusImage.dispose() ; }
} ;



Choices.prototype.getUi = function() { return this.babylon.containerStack ; } ;



Choices.prototype.run = async function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }

	var done = index => {
		console.warn( "Choice index:" , index ) ;
		this.gScene.controller.off( 'command' , onCommand ) ;
		this.onSelect( index ) ;
	} ;

	var onCommand = command => {
		if ( this.gScene.navigationByKey ) {
			let keyFocusIndex = this.keyFocusIndex ;

			switch ( command ) {
				case 'confirm':
					this.buttons[ keyFocusIndex ].pressDown() ;
					setTimeout( () => this.buttons[ keyFocusIndex ].pressUp() , 200 ) ;
					break ;
				case 'up':
					if ( this.keyFocusIndex > 0 ) {
						this.keyFocusIndex -- ;
						this.focus( this.keyFocusIndex ) ;
					}
					break ;
				case 'down':
					if ( this.keyFocusIndex < this.buttons.length - 1 ) {
						this.keyFocusIndex ++ ;
						this.focus( this.keyFocusIndex ) ;
					}
					break ;
			}
		}
		else if ( command === 'confirm' || command === 'up' || command === 'down' ) {
			this.gScene.setNavigationByKey( true ) ;
			this.focus( this.keyFocusIndex ) ;
		}
	} ;

	this.gScene.controller.on( 'command' , onCommand ) ;

	this.buttons.forEach( ( button , index ) => {
		button.run( () => done( index ) ) ;
		button.on( 'mouseInteracting' , () => {
			this.gScene.setNavigationByKey( false ) ;
			this.focus( null ) ;
		} ) ;
	} ) ;

	if ( this.gScene.navigationByKey ) {
		// Delay it, because we need to compute some position that are unknown until rendered
		setTimeout( () => this.focus( this.keyFocusIndex ) , 50 ) ;
	}
} ;



Choices.prototype.focus = function( focusIndex ) {
	var found = false ,
		focusImage = this.babylon.focusImage ;
	
	this.buttons.forEach( ( button , index ) => {
		if ( index === focusIndex ) {
			let position = misc.getControlPositionRelativeTo(
				button.babylon.containerRect , focusImage.parent ,
				Control.HORIZONTAL_ALIGNMENT_CENTER , Control.VERTICAL_ALIGNMENT_CENTER ,
				-1 , 0
			) ;
			console.warn( "focusImage.parent" , focusImage.parent , "position" , position ) ;
			
			focusImage.isVisible = true ;
			focusImage.leftInPixels = position.left ;
			focusImage.topInPixels = position.top ;
			
			button.hover() ;
			found = true ;
		}
		else {
			button.standingBy() ;
		}
	} ) ;
	
	if ( ! found ) {
		focusImage.isVisible = false ;
	}
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
	
	var alignment = misc.positionToAlignment( this.position ) ;
	stack.horizontalAlignment = alignment.horizontalAlignment ;
	stack.verticalAlignment = alignment.verticalAlignment ;

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
	
	// The focus image, usually an arrow, is on a button highlighted by keyboard arrow or gamepad, ready to be 'confirmed'
	var focusImage = this.babylon.focusImage = new BABYLON.GUI.Image( 'message-next' , '/icons/focus.png' ) ;
	focusImage.width = "15px" ;
	focusImage.height = "30px" ;
	focusImage.isVisible = false ;
	parentContainer.addControl( focusImage ) ;

	this.guiCreated = true ;
} ;

