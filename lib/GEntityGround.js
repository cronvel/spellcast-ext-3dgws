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
	Ground howto:
	https://doc.babylonjs.com/how_to/set_shapes#ground
	Tiled ground demo:
	https://www.babylonjs-playground.com/#1XBLWB#6
	Multi-material for tiles:
	https://makina-corpus.com/blog/metier/2014/how-to-use-multimaterials-with-a-tiled-ground-in-babylonjs
*/

function GEntityGround( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityGround.prototype = Object.create( GEntity.prototype ) ;
GEntityGround.prototype.constructor = GEntityGround ;

module.exports = GEntityGround ;



// Update the gEntity's texture
GEntityGround.prototype.updateTexture_ = function( texturePack , variant ) {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityGround.updateTexture_()" , texturePack , variant ) ;

	var url = variant.frames[ 0 ].url ;
	this.babylon.material = material = new Babylon.StandardMaterial( 'simpleMaterial' , scene ) ;
	material.backFaceCulling = true ;
	//*
	material.diffuseTexture = new Babylon.Texture( this.dom.cleanUrl( url ) , scene ) ;
	material.diffuseTexture.uScale = 20 ;
	material.diffuseTexture.vScale = 20 ;
	//material.specularPower = 0 ;
	material.specularColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;
	//*/
	/*	For instance there is only ambient light, so no need to compute multiple pass
	material.ambientTexture = new Babylon.Texture( this.dom.cleanUrl( url ) , scene ) ;
	material.ambientTexture.uScale = 20 ;
	material.ambientTexture.vScale = 20 ;
	//*/
	
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



GEntityGround.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.MeshBuilder.CreateGround(
		'ground' ,
		{ height: 1000 , width: 1000 , subdivisions: 4 } ,
		scene
	) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

