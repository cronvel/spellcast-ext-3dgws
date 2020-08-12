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
const GTransition = require( './GTransition.js' ) ;

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
function GEntity( dom , gScene , data ) {
	this.dom = dom ;	// Dom instance, immutable
	this.gScene = gScene ;
	this.usage = data.usage || 'sprite' ;	// immutable

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;
	this.variant = 'default' ;
	this.location = null ;
	this.position = { x: 0 , y: 0 , z: 0 } ;
	this.positionMode = 'default' ;
	this.size = { x: 1 , y: 1 , z: 1 } ;
	this.sizeMode = 'default' ;
	this.rotation = { x: 0 , y: 0 , z: 0 } ;
	this.rotationMode = 'default' ;
	//this.rotation = TO BE DEFINED....

	this.data = {} ;
	this.meta = {} ;
	this.engine = {} ;

	this.transitions = {
		transform: null ,	// change in position, size, rotation, 3D transform/matrix and more...
		//position: null , size: null , rotation: null ,
		opacity: null ,
		color: null ,
		effect: null
	} ;


	// Internal
	this.updateMeshNeeded = true ;
	this.babylon = {
		material: null ,
		mesh: null
	} ;

	this.defineStates( 'loaded' , 'loading' ) ;
}

GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;

	// Structural/discrete part

	if ( data.texturePack !== undefined || data.variant !== undefined || data.theme !== undefined ) {
		await this.updateTexture( data.texturePack , data.variant , data.theme ) ;
	}

	if ( this.updateMeshNeeded ) { await this.updateMesh() ; }

	//if ( data.button !== undefined ) { this.updateButton( data.button ) ; }


	// Continuous part

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	if (
		data.position !== undefined || data.positionMode !== undefined
		|| data.size !== undefined || data.sizeMode !== undefined
		|| data.rotation !== undefined || data.rotationMode !== undefined
	) {
		this.updateTransform( data ) ;
	}

	//if ( data.meta ) { this.updateMeta( data.meta ) ; }
} ;



// Update the gEntity's texture
GEntity.prototype.updateTexture = function( texturePackId , variantId , themeId ) {
	var texturePack , variant ;

	if ( texturePackId !== undefined ) { this.texturePack = texturePackId || null ; }
	if ( variantId !== undefined ) { this.variant = variantId || null ; }
	if ( themeId !== undefined ) { this.theme = themeId || null ; }

	console.warn( "3D GEntity.updateTexture()" , texturePackId , variantId , themeId ) ;

	texturePack = this.gScene.texturePacks[ this.texturePack + '/' + ( this.theme || this.gScene.theme ) ] ;

	if ( ! texturePack ) {
		console.warn( "3D Texture pack" , this.texturePack + '/' + ( this.theme || this.gScene.theme ) , "not found" ) ;
		texturePack = this.gScene.texturePacks[ this.texturePack + '/default' ] ;

		if ( ! texturePack ) {
			console.warn( "3D Texture pack fallback" , this.texturePack + '/default' , "not found" ) ;
			return ;
		}
	}

	variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;

	if ( ! variant ) {
		console.warn( "3D Texture pack variant" , this.variant , "not found, and default variant missing too" ) ;
		return ;
	}

	return this.updateTexture_( texturePack , variant ) ;
} ;



// Size, positioning and rotation
GEntity.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntity.updateTransform()" , data ) ;
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

