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



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityShadow( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityShadow.prototype = Object.create( GEntity.prototype ) ;
GEntityShadow.prototype.constructor = GEntityShadow ;

module.exports = GEntityShadow ;



// Update the gEntity's material/texture
GEntityShadow.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;	// Mandatory for alpha transparency

	//*
	//material.diffuseColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.diffuseColor = new BABYLON.Color3( 0.5 , 0.5 , 0.5 ) ;
	//material.diffuseTexture.hasAlpha = true ;
	//material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.disableLighting = true ;
	//material.alpha = 0.5 ;

	material.opacityTexture = new BABYLON.Texture( '/textures/shadow.png' , scene ) ;
	material.opacityTexture.wrapU = material.opacityTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;
	//*/

	/*
	material.diffuseTexture = new BABYLON.Texture( '/textures/shadow.png' , scene ) ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;
	material.diffuseTexture.hasAlpha = true ;
	material.disableLighting = true ;
	material.useAlphaFromDiffuseTexture = true ;
	//*/

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityShadow.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'shadow' , undefined , scene ) ;	//, true ) ;

	// Make the plane parallel to the ground, and apply (“bake”) to the mesh
	mesh.rotation.x = Math.PI / 2 ;
	//mesh.position.x = 0.5 ;
	//mesh.position.z = 0.5 ;
	mesh.bakeCurrentTransformIntoVertices() ;

	mesh.scaling.x = this.size.x ;
	//mesh.scaling.y = this.size.y ;
	mesh.scaling.z = this.size.z ;

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

