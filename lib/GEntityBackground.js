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



/*
	Background is a 360° texture wrapped around a cylinder, a sort of skybox without zenith nor nadir.
*/

function GEntityBackground( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityBackground.prototype = Object.create( GEntity.prototype ) ;
GEntityBackground.prototype.constructor = GEntityBackground ;

module.exports = GEntityBackground ;



GEntityBackground.prototype.localBBoxSize = 1000 ;



// Update the gEntity's texture
GEntityBackground.prototype.updateTexture_ = function( texturePack , variant ) {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityBackground.updateTexture_()" , texturePack , variant ) ;

	var url = variant.frames[ 0 ].url ;
	this.babylon.material = material = new Babylon.StandardMaterial( 'simpleMaterial' , scene ) ;
	material.backFaceCulling = true ;
	material.diffuseTexture = new Babylon.Texture( this.dom.cleanUrl( url ) , scene ) ;
	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;
	
	// TEMP!
	material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}
} ;



GEntityBackground.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.MeshBuilder.CreateCylinder(
		'background' ,
		{
			height: this.localBBoxSize ,
			diameter: this.localBBoxSize ,
			tessellation: 24 ,
			cap: Babylon.Mesh.NO_CAP ,
			sideOrientation: Babylon.Mesh.BACKSIDE
		} ,
		scene
	) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



// Size, positioning and rotation
GEntityBackground.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntityBackground.updateTransform()" , data ) ;
	return ;
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
		mesh.scaling.x = this.size.x ;
		mesh.scaling.y = this.size.y ;
		mesh.scaling.z = this.size.z ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
	}
} ;

