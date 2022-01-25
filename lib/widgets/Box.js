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



const misc = require( '../misc.js' ) ;
const extension = require( '../browser-extension.js' ) ;

const LeanEvents = require( 'nextgen-events/lib/LeanEvents.js' ) ;
const Promise = require( 'seventh' ) ;



function Box( dom , gScene , options = {} , parent = null ) {
	this.dom = dom ;    // Dom instance, immutable
	this.gScene = gScene ;
	this.parent = parent ?? this.gScene ;

	this.paddingRight = this.paddingLeft = this.paddingBottom = this.paddingTop = 0 ;

	this.ninePatchImageUrl = null ;
	this.containerRectStyle = {} ;

	this.guiCreated = false ;

	this.babylon = {
		containerRect: null ,
		boxImage: null
	} ;
}

Box.prototype = Object.create( LeanEvents.prototype ) ;
Box.prototype.constructor = Box ;

module.exports = Box ;



Box.prototype.childrenWidthInPixelsRequired = false ;
Box.prototype.childrenHeightInPixelsRequired = false ;
Box.prototype.childrenMaxWidth = 0 ;
Box.prototype.childrenMaxHeight = 0 ;



Box.prototype.destroy = function() {
	if ( this.babylon.containerRect ) { this.babylon.containerRect.dispose() ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.dispose() ; }
} ;



Box.prototype.getUi = function() { return this.babylon.containerRect ; } ;



// Should be redefined
Box.prototype.run = function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	this.destroy() ;
} ;



const THEME = Box.THEME = {
	default: {
		position: 'center' ,
		panel: {
			width: 0.5 ,
			height: 0.2 ,
			opacity: 1 ,
			backgroundColor: "green" ,
			borderColor: "orange" ,
			borderWidth: 4 ,
			cornerRadius: 20 ,
			padding: {
				left: "16px" ,
				right: "16px" ,
				top: "0px" ,
				bottom: "0px"
			}
		}
	}
} ;



Box.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	var containerRect , boxImage , structuredTextBlock , width , height ;

	width = theme?.panel?.width ?? defaultTheme?.panel?.width ?? 0.5 ;
	height = theme?.panel?.height ?? defaultTheme?.panel?.height ?? 0.2 ;

	console.warn( ".childrenHeightInPixelsRequired:" , this.parent.childrenHeightInPixelsRequired , height ) ;
	if ( this.parent.childrenHeightInPixelsRequired && typeof height === 'number' ) {
		height = ( height * this.parent.childrenMaxHeight ) + 'px' ;
		console.warn( "Set height to:" , height ) ;
	}

	containerRect = this.babylon.containerRect = new BABYLON.GUI.Rectangle( 'containerRect' ) ;
	containerRect.width = this.containerRectStyle.width = width ;
	containerRect.height = this.containerRectStyle.height = height ;
	containerRect.thickness = 0 ;

	this.setControlAlignment( containerRect , theme?.position ?? defaultTheme?.position ) ;

	this.parent.getUi().addControl( containerRect ) ;

	console.warn( "THEME: " , theme , theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) ;

	this.ninePatchImageUrl = theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ;

	if ( this.ninePatchImageUrl ) {
		boxImage = this.babylon.boxImage = new BABYLON.GUI.Image( 'boxImage' , this.ninePatchImageUrl ) ;
		//boxImage.width = "200px";
		//boxImage.height = "300px";
		boxImage.stretch = BABYLON.GUI.Image.STRETCH_NINE_PATCH ;

		// /!\ boxImage.width and boxImage.height are undefined, until the image is loaded!!!
		// /!\ This will produce bug!
		boxImage.sliceLeft = this.paddingLeft = theme?.panel?.ninePatchImage?.sliceLeft ?? defaultTheme?.panel?.ninePatchImage?.sliceLeft ?? 0 ;
		boxImage.sliceTop = this.paddingTop = theme?.panel?.ninePatchImage?.sliceTop ?? defaultTheme?.panel?.ninePatchImage?.sliceTop ?? 0 ;
		boxImage.sliceRight = theme?.panel?.ninePatchImage?.sliceRight ?? defaultTheme?.panel?.ninePatchImage?.sliceRight ?? boxImage.width ;
		boxImage.sliceBottom = theme?.panel?.ninePatchImage?.sliceBottom ?? defaultTheme?.panel?.ninePatchImage?.sliceBottom ?? boxImage.height ;

		// /!\ TMP, due to previous bug
		this.paddingRight = this.paddingLeft ;
		this.paddingBottom = this.paddingTop ;

		//boxImage.isPointerBlocker = false ;

		containerRect.addControl( boxImage ) ;
	}
	else {
		this.containerRectStyle.opacity = theme?.panel?.opacity ?? defaultTheme?.panel?.opacity ;
		this.containerRectStyle.backgroundColor = theme?.panel?.backgroundColor ?? defaultTheme?.panel?.backgroundColor ;
		this.containerRectStyle.borderColor = theme?.panel?.borderColor ?? defaultTheme?.panel?.borderColor ;
		this.containerRectStyle.borderWidth = theme?.panel?.borderWidth ?? defaultTheme?.panel?.borderWidth ;
		this.containerRectStyle.cornerRadius = theme?.panel?.cornerRadius ?? defaultTheme?.panel?.cornerRadius ;
		this.applyRectangleStyle( containerRect , this.containerRectStyle ) ;
	}
	
	/*
	// Not defined in time (because width is not in pixels but is a rate)
	if ( this.paddingLeft + this.paddingRight > containerRect.widthInPixels / 2 ) {
		this.paddingLeft = this.paddingRight = Math.round( containerRect.widthInPixels / 4 ) ;
	}
	if ( this.paddingTop + this.paddingBottom > containerRect.heightInPixels / 2 ) {
		this.paddingTop = this.paddingBottom = Math.round( containerRect.heightInPixels / 4 ) ;
	}
	*/

	// Needed for containerRect.onPointerClickObservable
	this.babylon.containerRect.isPointerBlocker = true ;
	this.guiCreated = true ;
} ;



Box.prototype.setControlAlignment = function( control , type ) {
	switch ( type ) {
		case 'top' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			break ;
		case 'bottom' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			break ;
		case 'left' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
			break ;
		case 'right' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
			break ;
		case 'top-left' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			break ;
		case 'top-right' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			break ;
		case 'bottom-left' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			break ;
		case 'bottom-right' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			break ;
		case 'center' :
		default :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
			break ;
	}
} ;



Box.prototype.applyRectangleStyle = function( rectangle , style ) {
	console.warn( "******** APPLY STYLE" , style ) ;
	if ( style.width !== undefined ) { rectangle.width = style.width ; }
	if ( style.height !== undefined ) { rectangle.height = style.height ; }
	if ( style.opacity !== undefined ) { rectangle.alpha = style.opacity ; }
	if ( style.backgroundColor !== undefined ) { rectangle.background = style.backgroundColor ; }
	if ( style.borderColor !== undefined ) { rectangle.color = style.borderColor ; }
	if ( style.borderWidth !== undefined ) { rectangle.thickness = style.borderWidth ; }
	if ( style.cornerRadius !== undefined ) { rectangle.cornerRadius = style.cornerRadius ; }
} ;

