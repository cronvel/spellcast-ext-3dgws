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
const Camera = require( './Camera.js' ) ;

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
function GScene( dom , data ) {
	this.dom = dom ;    // Dom instance, immutable
	//this.id = data.id ;		// immutable
	this.engineId = data.engineId ;	// immutable
	this.rightHanded = data.rightHanded !== undefined ? !! data.rightHanded : true ;    // immutable

	this.active = false ;
	this.paused = false ;
	this.persistent = false ;
	this.theme = 'default' ;
	this.engine = {} ;
	this.texturePacks = {} ;
	this.gEntities = {} ;
	this.gEntityLocations = {} ;

	this.globalCamera = null ;
	this.roleCamera = null ;	// For multiplayer, not implemented yet

	this.$gscene = document.createElement( 'canvas' ) ;
	// At creation, the visibility is turned off, the initial update will turn it on again
	this.$gscene.classList.add( 'gscene' ) ;
	this.$gscene.style.visibility = 'hidden' ;
	this.dom.$gfx.append( this.$gscene ) ;

	this.resizeObserver = null ;	// used to detect when the canvas element is resized

	// What have changed before the last rendered scene
	this.changes = {
		camera: false
	} ;

	//this.continuousChanges = { camera: 0 } ;

	// Babylon stuffs
	this.babylon = {
		engine: null ,
		scene: null
	} ;
	
	this.initScene() ;
}

GScene.prototype = Object.create( Ngev.prototype ) ;
GScene.prototype.constructor = GScene ;

module.exports = GScene ;



GScene.prototype.initScene = function() {
	// Instanciate Babylon engine
	var engine = this.babylon.engine = new Babylon.Engine( this.$gscene , true ) ;

	// Create the scene space
	var scene = this.babylon.scene = new Babylon.Scene( engine ) ;

	// Important, because by default the coordinate system is like DirectX (left-handed) not like math and OpenGL (right-handed)
	// /!\ THERE ARE BUGS WITH SPRITES AND RIGHT-HANDED SYSTEM /!\
	//scene.useRightHandedSystem = true ;

	// Optimizations
	scene.autoClear = false ;		// Don't clear the color buffer between frame (skybox expected!)
	scene.autoClearDepthAndStencil = false ;	// Same with depth and stencil buffer

	// TEMP! Point Lights to test sprites!
	var pointLightPosition = new Babylon.Vector3( 0 , 0 , 0 ) ;
	//* Add the point light
	var pointLight = new Babylon.PointLight( "pointLight" , pointLightPosition , scene ) ;
	pointLight.diffuse = new Babylon.Color3( 1 , 1 , 1 ) ;
	pointLight.specular = new Babylon.Color3( 1 , 1 , 1 ) ;
	pointLight.intensity = 1 ;

	// Add the physical sphere for the point light
	var pointLightSphere = Babylon.MeshBuilder.CreateSphere( "pointLightSphere" , { diameter: 2 } , scene ) ;
	pointLightSphere.position = pointLightPosition ;
	pointLightSphere.material = new Babylon.StandardMaterial( 'pointLightMaterial' , scene ) ;
	pointLightSphere.material.diffuseColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	pointLightSphere.material.specularColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	pointLightSphere.material.emissiveColor = new Babylon.Color3( 1 , 1 , 0 ) ;
	//*/



	// Add a camera to the scene and attach it to the canvas
	this.globalCamera = new Camera( this ) ;

	// TEMP!
	var t = 0 , radius , baseRadius = 30 ;

	// Register a render loop to repeatedly render the scene
	engine.runRenderLoop( () => {
		this.emitIfListener( 'render' , this.changes ) ;
		this.changes.camera = false ;
		
		//+++ TEMP! Move the pointlight
		radius = baseRadius * ( 1 + Math.cos( 0.51 * t ) ) ;
		pointLightPosition.x = 15 + radius * Math.cos( 0.7 * t ) ;
		pointLightPosition.z = 30 + radius * Math.sin( 0.7 * t ) ;
		pointLightPosition.y = 20 + 18 * Math.sin( 1.17 * t ) ;
		t += 0.01 ;
		//--- TEMP

		scene.render() ;
	} ) ;
	
	// ResizeObserver is used to detect when the canvas element is resized, to avoid image streching
	this.resizeObserver = new ResizeObserver( () => engine.resize() ) ;
	this.resizeObserver.observe( this.$gscene ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
GScene.prototype.update = function( data ) {
	if ( data.active !== undefined ) {
		this.active = !! data.active ;
		this.$gscene.style.visibility = this.active ? 'visible' : 'hidden' ;
	}

	if ( data.paused !== undefined ) { this.paused = !! data.paused ; }
	if ( data.persistent !== undefined ) { this.persistent = !! data.persistent ; }
	//if ( data.roles !== undefined ) { this.roles = data.roles ; }
	if ( data.theme !== undefined ) { this.theme = data.theme || 'default' ; }

	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.globalCamera !== undefined ) { this.globalCamera.update( data.globalCamera ) ; }

	// For instance, there is no async code in GScene, but the API have to allow it
	return Promise.resolved ;
} ;



GScene.prototype.hasGEntity = function( gEntityId ) { return gEntityId in this.gEntities ; } ;
GScene.prototype.getGEntity = function( gEntityId ) { return this.gEntities[ gEntityId ] ; } ;
GScene.prototype.addGEntity = function( gEntityId , gEntity ) { this.gEntities[ gEntityId ] = gEntity ; } ;

GScene.prototype.removeGEntity = function( gEntityId ) {
    var gEntity = this.gEntities[ gEntityId ] ;
    if ( ! gEntity ) { return false ; }

    delete this.gEntities[ gEntityId ] ;
    return true ;
} ;

