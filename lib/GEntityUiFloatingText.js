/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const GEntity = require( './GEntity.js' ) ;
const GEntityFloatingText = require( './GEntityFloatingText.js' ) ;

//const Promise = require( 'seventh' ) ;



function GEntityUiFloatingText( dom , gScene , data ) {
	GEntityFloatingText.call( this , dom , gScene , data ) ;

	this.special.content.textSize = 0.05 ;

	this.iconOffset = 0 ;
	this.safeIconOffset = false ;	// true when iconOffset is up to date
	this.blinkSafe = false ;
}

GEntityUiFloatingText.prototype = Object.create( GEntityFloatingText.prototype ) ;
GEntityUiFloatingText.prototype.constructor = GEntityUiFloatingText ;

module.exports = GEntityUiFloatingText ;



GEntityUiFloatingText.prototype.destroy = function() {
	if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
	if ( this.babylon.icon ) { this.babylon.icon.dispose() ; }

	GEntity.prototype.destroy.call( this ) ;
} ;



// Update the gEntity's material/texture
GEntityUiFloatingText.prototype.updateMaterial = function() {
	var ui , textBlock ;

	console.warn( "3D GEntityUiFloatingText.updateMaterial()" ) ;

	if ( this.gScene.babylon.ui ) {
		ui = this.gScene.babylon.ui ;
	}
	else {
		this.gScene.babylon.ui = ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI( 'ui' ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new BABYLON.GUI.TextBlock() ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		textBlock.alpha = this.opacity ;
		textBlock.resizeToFit = true ;
		ui.addControl( textBlock ) ;

		// SHOULD BE DONE AFTER .addControl()
		if ( this.parent ) {
			textBlock.linkWithMesh( this.parent.babylon.mesh ) ;

			if ( ! this.blinkSafe ) {
				textBlock.alpha = 0 ;
				setTimeout( () => {
					this.blinkSafe = true ;
					textBlock.alpha = this.opacity ;
				} , 20 ) ;
			}
		}
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityUiFloatingText.prototype.updateOpacity = function( opacity , volatile = false ) {
	if ( ! this.blinkSafe ) {
		setTimeout( () => {
			this.blinkSafe = true ;
			this.updateOpacity( opacity , volatile ) ;
		} , 20 ) ;
		return ;
	}

	GEntityFloatingText.prototype.updateOpacity.call( this , opacity , volatile ) ;
} ;



// Because font does not use 100% of height all the time...
const ICON_HEIGHT_RATIO = 0.8 ;

GEntityUiFloatingText.prototype.updateContent = function( content ) {
	var ui = this.gScene.babylon.ui ,
		uiSize = ui.getSize() ,
		textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) {
		this.safeIconOffset = false ;
		textBlock.text = this.special.content.text = '' + content.text ;
	}

	if ( typeof content.textSize === 'number' ) {
		this.safeIconOffset = false ;
		this.special.content.textSize = content.textSize ;
		textBlock.fontSizeInPixels = Math.round( content.textSize * uiSize.height ) ;
	}

	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.outlineColor === 'string' ) { textBlock.outlineColor = this.special.content.outlineColor = content.outlineColor ; }

	if ( typeof content.outlineWidth === 'number' ) {
		this.special.content.outlineWidth = content.outlineWidth ;
		textBlock.outlineWidth = Math.round( content.outlineWidth * uiSize.height ) ;
	}

	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }

	if ( typeof content.shadowBlur === 'number' ) {
		this.special.content.shadowBlur = content.shadowBlur ;
		textBlock.shadowBlur = Math.round( content.shadowBlur * uiSize.height ) ;
	}

	if ( content.icon ) { this.updateContentIcon( content ) ; }
} ;



GEntityUiFloatingText.prototype.updateContentIcon = function( content ) {
	var icon ,
		ui = this.gScene.babylon.ui ,
		textBlock = this.babylon.textBlock ;

	// /!\ Use a texture instead of a direct URL? So this could be preloaded?
	if ( this.babylon.icon ) {
		icon = this.babylon.icon ;
		icon.source = this.dom.cleanUrl( content.icon ) ;
		icon.width = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		icon.height = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
	}
	else {
		this.babylon.icon = icon = new BABYLON.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
		icon.widthInPixels = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		icon.heightInPixels = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		ui.addControl( icon ) ;

		// SHOULD BE DONE AFTER .addControl()
		if ( this.parent ) {
			icon.linkWithMesh( this.parent.babylon.mesh ) ;

			if ( ! this.blinkSafe ) {
				icon.alpha = 0 ;
				setTimeout( () => {
					this.blinkSafe = true ;
					icon.alpha = this.opacity ;
				} , 20 ) ;
			}
		}
	}

	this.updateContentIconOffset( () => {
		if ( this.parent ) {
			icon.linkOffsetXInPixels = textBlock.linkOffsetXInPixels - this.iconOffset ;
		}
		else {
			icon.leftInPixels = textBlock.leftInPixels - this.iconOffset ;
		}
	} ) ;
} ;



GEntityUiFloatingText.prototype.updateContentIconOffset = function( fn = null , retried = false ) {
	var icon = this.babylon.icon ,
		textBlock = this.babylon.textBlock ;

	//console.warn( "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& Before" , this.safeIconOffset , textBlock._width.isPixel , retried , this.iconOffset ) ;
	if ( retried ) { this.safeIconOffset = true ; }

	if ( ! this.safeIconOffset || ( ! textBlock._width.isPixel && ! retried ) ) {
		setTimeout( () => this.updateContentIconOffset( fn , true ) , 20 ) ;
		return ;
	}

	this.iconOffset = Math.round(
		icon.widthInPixels / 2 + textBlock.fontSizeInPixels / 4 +
		( textBlock._width.isPixel ? textBlock.widthInPixels / 2 : textBlock.fontSizeInPixels )
	) ;
	//console.warn( "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& After" , this.safeIconOffset , textBlock._width.isPixel , retried , this.iconOffset ) ;

	if ( fn ) { fn() ; }
} ;



GEntityUiFloatingText.prototype.updateMesh = function() {
	this.updateMeshNeeded = false ;
	return ;
} ;



GEntityUiFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;



GEntityUiFloatingText.prototype.updatePosition = function( data , volatile = false ) {
	var textBlock = this.babylon.textBlock ,
		icon = this.babylon.icon ;

	if ( icon && ! this.safeIconOffset ) {
		this.updateContentIconOffset( () => this.updatePosition( data , volatile ) ) ;
		return ;
	}

	var ui = this.gScene.babylon.ui ,
		uiSize = ui.getSize() ,
		scene = this.gScene.babylon.scene ;

	var iconX ,
		x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
	}

	x = -x * uiSize.width / 2 ;
	y = -y * uiSize.height / 2 ;
	iconX = x - this.iconOffset ;
	//console.warn( "######################################" , this.iconOffset , x , iconX ) ;

	if ( this.parent ) {
		if ( data.transition ) {
			data.transition.createAnimation( scene , textBlock , 'linkOffsetXInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , x ) ;
			data.transition.createAnimation( scene , textBlock , 'linkOffsetYInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;

			if ( icon ) {
				data.transition.createAnimation( scene , icon , 'linkOffsetXInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
				data.transition.createAnimation( scene , icon , 'linkOffsetYInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;
			}
		}
		else {
			textBlock.linkOffsetXInPixels = x ;
			textBlock.linkOffsetYInPixels = y ;

			if ( icon ) {
				icon.linkOffsetXInPixels = iconX ;
				icon.linkOffsetYInPixels = y ;
			}
		}
	}
	else {
		if ( data.transition ) {
			data.transition.createAnimation( scene , textBlock , 'leftInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , x ) ;
			data.transition.createAnimation( scene , textBlock , 'topInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;

			if ( icon ) {
				data.transition.createAnimation( scene , icon , 'leftInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
				data.transition.createAnimation( scene , icon , 'topInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;
			}
		}
		else {
			textBlock.leftInPixels = x ;
			textBlock.topInPixels = y ;

			if ( icon ) {
				icon.leftInPixels = iconX ;
				icon.topInPixels = y ;
			}
		}
	}
} ;

