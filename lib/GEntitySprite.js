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
	var scene = this.gScene.babylon.scene ;
	console.warn( "3D GEntitySprite.updateTexture_()" , texturePack , variant ) ;

	var url = variant.frames[ 0 ].url ;
	this.babylon.spriteManager = new Babylon.SpriteManager( 'spriteManager' , this.dom.cleanUrl( url ) , 1 , 400 , scene ) ;
	this.updateMeshNeeded = true ;
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateMesh = function() {
	var mesh ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = new Babylon.Sprite( 'sprite' , this.babylon.spriteManager ) ;
	mesh.stopAnimation() ; // Not animated
	mesh.cellIndex = 0 ;
	mesh.position.x = this.position.x ;
	mesh.position.y = this.position.y ;
	mesh.position.z = this.position.z ;
	mesh.width = this.size.x ;
	mesh.height = this.size.y ;
	mesh.angle = this.rotation.z ;

	// !!!Interesting properties!!!

	//mesh.invertU = -1 ;	// Horizontal flip
	//mesh.invertV = -1 ;	// Vertical flip
	//mesh.isPickable = true ;	// Click detection
	//mesh.useAlphaForPicking = true ;	// Click detection works only on opaque area

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntitySprite.updateTransform()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) {
		this.position = data.position ;

		if ( data.transition ) {
			console.warn( "mesh:" , mesh ) ;
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				mesh ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			mesh.position.set( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.size ) {
		this.size = data.size ;
		mesh.width = this.size.x ;
		mesh.height = this.size.y ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
		mesh.angle = this.rotation.z ;
	}
} ;

