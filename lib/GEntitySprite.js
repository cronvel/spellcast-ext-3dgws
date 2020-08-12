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



const Babylon = require( 'babylonjs' ) ;
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntitySprite( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntitySprite.prototype = Object.create( GEntity.prototype ) ;
GEntitySprite.prototype.constructor = GEntitySprite ;

module.exports = GEntitySprite ;



// Update the gEntity's texture
GEntitySprite.prototype.updateTexture_ = function( texturePack , variant ) {
	console.warn( "3D GEntitySprite.updateTexture_()" , texturePack , variant ) ;

	var url = variant.frames[ 0 ].url ;
	this.babylon.spriteManager = new Babylon.SpriteManager( 'spriteManager' , this.dom.cleanUrl( url ) , 1 , 400 , scene ) ;
	this.updateMeshNeeded = true ;
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateMesh = function() {
	var entity ;

	if ( this.babylon.entity ) { this.babylon.entity.dispose() ; }

	this.babylon.entity = entity = new Babylon.Sprite( 'sprite' , this.babylon.spriteManager ) ;
	entity.stopAnimation() ; // Not animated
	entity.cellIndex = 0 ;
	entity.position.x = this.position.x ;
	entity.position.y = this.position.y ;
	entity.position.z = this.position.z ;
	entity.width = this.size.x ;
	entity.height = this.size.y ;
	entity.angle = this.rotation.z ;

	// !!!Interesting properties!!!

	//entity.invertU = -1 ;	// Horizontal flip
	//entity.invertV = -1 ;	// Vertical flip
	//entity.isPickable = true ;	// Click detection
	//entity.useAlphaForPicking = true ;	// Click detection works only on opaque area
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntitySprite.updateTransform()" , data ) ;
	var entity = this.babylon.entity ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) {
		this.position = data.position ;

		if ( data.transition ) {
			console.warn( "entity:" , entity ) ;
			// Animation using easing
			
			data.transition.createAnimation(
				scene ,
				entity ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			entity.position.set( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.size ) {
		this.size = data.size ;
		entity.width = this.size.x ;
		entity.height = this.size.y ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
		entity.angle = this.rotation.z ;
	}
} ;

