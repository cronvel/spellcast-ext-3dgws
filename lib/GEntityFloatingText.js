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
//Babylon.GUI = 
//require( 'babylonjs-gui' ) ;
const GUI = require( './babylon.gui.min.js' ) ;
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityFloatingText( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityFloatingText.prototype = Object.create( GEntity.prototype ) ;
GEntityFloatingText.prototype.constructor = GEntityFloatingText ;

module.exports = GEntityFloatingText ;



// Update the gEntity's material/texture
GEntityFloatingText.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityFloatingText.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	//var frame = this.variantObject.frames[ 0 ] ;
	//this.babylon.material = material = new Babylon.StandardMaterial( 'spriteMaterial' , scene ) ;
	
	if ( ! mesh ) { mesh = this.updateMesh() ; }

	//*
	var planeText = BABYLON.PlaneBuilder.CreatePlane("planeForText", {width:40,height:10} , scene)
	planeText.position.x = 0
	planeText.position.y = 10
	planeText.position.z = 0
	planeText.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_ALL;
		
	var advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(planeText, 512, 128);
	var text = new GUI.TextBlock()
	text.text = "coucou"
	text.color = "red"
	text.fontSize = 100
	// text.shadowColor = "red"
	advancedTexture.background = "rgba(255,0,255,0.2)";
	advancedTexture.addControl(text)
	//*/
	
	console.warn( ">>>>>>>>>>>>>>>>>>>>>>>>> Babylon" , Babylon , BABYLON , GUI , text) ;
	/*
	var advancedTexture = Babylon.GUI.AdvancedDynamicTexture.CreateForMesh( mesh , 2048 , 2048 ) ;
	var text = new Babylon.GUI.TextBlock() ;
	text.text = "coucou" ;
	text.color = "red" ;
	text.fontSize = 100 ;
	// text.shadowColor = "red" ;
	advancedTexture.background = "rgba(255,0,255,0.002)" ;
	advancedTexture.addControl( text ) ;
	//*/

	//mesh.material = material ;
	mesh.material = null ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityFloatingText.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.Mesh.CreatePlane( 'floating-text' , 10 , scene ) ;	//, true ) ;

	//mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_ALL;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

