/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

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



// Prototyped by cronvel here: https://playground.babylonjs.com/#JJGVMJ#15



const Promise = require( 'seventh' ) ;
const meshUtils = require( './meshUtils.js' ) ;



function DiceRoller( gScene , params ) {
	this.gScene = gScene ;

	// Parameters
	this.dieCount = params.dice ;
	this.faceValues = params.values ;
	this.dieDiffuseUrl = params.skinUrl || null ;
	this.dieSize = 0.2 ;
	this.dieFaceReindex = [ 0 , 5 , 1 , 4 , 2 , 3 ] ;	// Because 1 is opposite of 6, 2 of 5 and 3 of 4
	this.diceRollTimeLimit = 3000 ;	// Force computing the roll after this timelimit
	this.maxPowerDuration = 1000 ;
	this.minThrowingPower = 5 ;
	this.maxThrowingPower = 20 ;
	this.arrowLength = 0.4 ;
	this.physicsTimeStep = 10 ; // 100 update per seconds (seems to make it deterministic)
	this.gravity = 20 ;	// Set gravity higher than usual, to scale it with oversized dice
	this.friction = 0.9 ;
	this.restitution = 0.6 ;
	this.cameraHeight = 3.8 ;
	this.wallVisibility = false ;
	this.wallSize = 3 ;
	this.wallThickness = 0.5 ;	// Good thickness prevents bug of dice escaping the box
	this.stillnessVelocitySumLimit = 0.01 ;	// Used to detect if the dices are still
	
	this.destroyed = false ;
	
	// Babylon stuffs
	this.babylon = {
		scene: null ,
		physicsEngine: null ,
		camera: null ,
		light: null ,
		diceMaterial: null ,
		arrowMaterial: null ,
		dice: [] ,
		arrow: null ,
		ui: null
	} ;
}

module.exports = DiceRoller ;



DiceRoller.prototype.destroy = function() {
	if ( this.destroyed ) { return ; }

	this.babylon.dice.forEach( die => die.dispose() ) ;
	this.babylon.dice.length = 0 ;
	if ( this.babylon.arrow ) { this.babylon.arrow.dispose() ; this.babylon.arrow = null ; }
	if ( this.babylon.diceMaterial ) { this.babylon.diceMaterial.dispose() ; this.babylon.diceMaterial = null ; }
	if ( this.babylon.arrowMaterial ) { this.babylon.arrowMaterial.dispose() ; this.babylon.arrowMaterial = null ; }
	if ( this.babylon.physicsEngine ) { this.babylon.physicsEngine.dispose() ; this.babylon.physicsEngine = null ; }
	if ( this.babylon.light ) { this.babylon.light.dispose() ; this.babylon.light = null ; }
	if ( this.babylon.ui ) { this.babylon.ui.dispose() ; this.babylon.ui = null ; }
	if ( this.babylon.camera ) { this.babylon.camera.dispose() ; this.babylon.camera = null ; }
	if ( this.babylon.scene ) { this.babylon.scene.dispose() ; this.babylon.scene = this.gScene.babylon.diceRollerScene = null ; }

	this.destroyed = true ;
} ;



DiceRoller.prototype.init = function() {
	if ( this.gScene.babylon.diceRollerScene ) { throw new Error( "DiceRoller: there is already a diceRollerScene for these GScene" ) ; }

	var engine = this.gScene.babylon.engine ,
		scene = this.babylon.scene = this.gScene.babylon.diceRollerScene = new BABYLON.Scene( engine ) ,
		ratio = engine.getRenderWidth() / engine.getRenderHeight() ;

	scene.autoClear = false ;       // Don't clear the color buffer between frame (skybox expected!)
	//scene.autoClearDepthAndStencil = false ;    // Same with depth and stencil buffer

	scene.enablePhysics( new BABYLON.Vector3( 0 , -this.gravity , 0 ) ,
		new BABYLON.CannonJSPlugin()
		//new BABYLON.AmmoJSPlugin()
		//new BABYLON.OimoJSPlugin()
	) ;

	this.babylon.physicsEngine = scene.getPhysicsEngine() ;
	this.babylon.physicsEngine.setSubTimeStep( this.physicsTimeStep ) ;

	// Camera
	var camera , cx = 0 , cz = 0 ;
	/*
	if ( ratio > 1 ) { cx = ( ratio - 1 ) * 0.25 * this.cameraHeight ; }
	else if ( ratio < 1 ) { cz = - ( 1 - ratio ) * 0.25 * this.cameraHeight ; }
	*/
	camera = this.babylon.camera = new BABYLON.ArcRotateCamera( 'camera' , -Math.PI / 2 , 0 , this.cameraHeight , new BABYLON.Vector3( cx , 0 , cz ) , scene ) ;
	camera.wheelPrecision = 1000 ;
	camera.minZ = 0.05 ;

	// Light
	this.babylon.light = new BABYLON.HemisphericLight( 'light' , new BABYLON.Vector3( -0.3 , 1 , -0.3 ) , scene ) ;
	this.babylon.light.intensity = 0.7 ;

	var diceMat = this.babylon.diceMaterial = new BABYLON.StandardMaterial( 'diceMaterial' , scene ) ;
	diceMat.diffuseTexture = new BABYLON.Texture(
		this.dieDiffuseUrl ? this.gScene.dom.cleanUrl( this.dieDiffuseUrl ) : "/textures/die.png" ,
		scene
	) ;
	diceMat.specularColor = new BABYLON.Color3( 0.3 , 0.3 , 0.3 ) ;

	var arrowMat = this.babylon.arrowMaterial = new BABYLON.StandardMaterial( 'arrowMaterial' , scene ) ;
	arrowMat.diffuseTexture = new BABYLON.Texture( "/textures/arrow.png" , scene ) ;
	arrowMat.diffuseTexture.hasAlpha = true ;
	arrowMat.backFaceCulling = false ;

	// Create face UVs for the dice
	var columns = 6 ;
	var faceUV = new Array( 6 ) ;

	for ( let i = 0 ; i < 6 ; i ++ ) {
		let j = this.dieFaceReindex[ i ] ;
		faceUV[ i ] = new BABYLON.Vector4( j / columns , 0 , ( j + 1 ) / columns , 1 ) ;
	}

	var arrow = this.babylon.arrow = BABYLON.MeshBuilder.CreatePlane( "arrow" , { height: 0.5 , width: this.arrowLength } , scene ) ;
	arrow.material = arrowMat ;
	arrow.rotation.x = Math.PI / 2 ;
	arrow.rotation.y = 0 ;//Math.PI;
	arrow.position.y = 1 ;
	arrow.position.x = -0.8 - this.arrowLength / 2 ;
	arrow.bakeTransformIntoVertices( BABYLON.Matrix.Translation( this.arrowLength / 2 , 0 , 0 ) ) ;


	var nWall = BABYLON.MeshBuilder.CreateBox( "north" , { width: this.wallSize , height: this.wallSize , depth: this.wallThickness } , scene ) ;
	nWall.position.y = this.wallSize / 2 ;
	nWall.position.z = this.wallSize / 2 ;
	nWall.physicsImpostor = new BABYLON.PhysicsImpostor( nWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	var sWall = BABYLON.MeshBuilder.CreateBox( "south" , { width: this.wallSize , height: this.wallSize , depth: this.wallThickness } , scene ) ;
	sWall.position.y = this.wallSize / 2 ;
	sWall.position.z = -this.wallSize / 2 ;
	sWall.physicsImpostor = new BABYLON.PhysicsImpostor( sWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	var eWall = BABYLON.MeshBuilder.CreateBox( "east" , { width: this.wallThickness , height: this.wallSize , depth: this.wallSize } , scene ) ;
	eWall.position.y = this.wallSize / 2 ;
	eWall.position.x = this.wallSize / 2 ;
	eWall.physicsImpostor = new BABYLON.PhysicsImpostor( eWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	var wWall = BABYLON.MeshBuilder.CreateBox( "west" , { width: this.wallThickness , height: this.wallSize , depth: this.wallSize } , scene ) ;
	wWall.position.y = this.wallSize / 2 ;
	wWall.position.x = -this.wallSize / 2 ;
	wWall.physicsImpostor = new BABYLON.PhysicsImpostor( wWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	var tWall = BABYLON.MeshBuilder.CreateBox( "top" , { width: this.wallSize , height: this.wallThickness , depth: this.wallSize } , scene ) ;
	tWall.position.y = this.wallSize ;
	tWall.physicsImpostor = new BABYLON.PhysicsImpostor( tWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	var bWall = BABYLON.MeshBuilder.CreateBox( "bottom" , { width: this.wallSize , height: this.wallThickness , depth: this.wallSize } , scene ) ;
	bWall.physicsImpostor = new BABYLON.PhysicsImpostor( bWall , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 0 , restitution: this.restitution , friction: this.friction } , scene ) ;

	if ( ! this.wallVisibility ) {
		nWall.setEnabled( false ) ;
		sWall.setEnabled( false ) ;
		eWall.setEnabled( false ) ;
		wWall.setEnabled( false ) ;
		tWall.setEnabled( false ) ;
		bWall.setEnabled( false ) ;
	}

	for ( let i = 0 ; i < this.dieCount ; i ++ ) {
		let die = BABYLON.MeshBuilder.CreateBox( "die" , { size: this.dieSize , faceUV , wrap: true } , scene ) ;
		die.material = diceMat ;

		let yOffset = Math.round( i / 6 ) ;
		let zOffset = i % 6 ;
		die.position.x = -this.wallSize / 2 * 0.75 ;
		die.position.y = this.wallThickness / 2 + 0.4 + yOffset * this.dieSize * 1.2 ;
		die.position.z = -this.wallSize / 2 + 2 * this.wallThickness + zOffset * this.dieSize * 1.5 ;
		die.rotation.x = 2 * Math.PI * Math.random() ;
		die.rotation.y = 2 * Math.PI * Math.random() ;
		die.rotation.z = 2 * Math.PI * Math.random() ;

		//die.physicsImpostor = new BABYLON.PhysicsImpostor(die, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: this.restitution , friction: this.friction }, scene);
		//die.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(-10 - 10*Math.random() , 3 * ( 2 * Math.random() - 1 ) , 8 * ( 2 * Math.random() - 1 )));

		this.babylon.dice.push( die ) ;
	}
	
	console.warn( "DirceRoller init done!" ) ;
} ;



DiceRoller.prototype.roll = function() {
	console.warn( "DirceRoller roll" ) ;
	var result , startAt , intervalTimer ,
		scene = this.babylon.scene ,
		arrow = this.babylon.arrow ,
		refreshTimeout = 10 ,
		direction = new BABYLON.Vector3( 10 , 0 , 0 ) ,
		promise = new Promise() ;

	this.gScene.globalCamera.babylon.camera.detachControl() ;
	
	promise.then( () => {
		if ( this.gScene.globalCamera.free ) {
			this.gScene.globalCamera.babylon.camera.attachControl() ;
		}
	} ) ;

	var release = async () => {
		scene.onPointerDown = scene.onPointerMove = scene.onPointerUp = null ;
		if ( intervalTimer ) { clearInterval( intervalTimer ) ; }
		arrow.setEnabled( false ) ;
		
		// Scale power from 0 to 1
		var power = Math.min( 1 , ( Date.now() - startAt ) / this.maxPowerDuration ) ;

		// Convert the screen Y to the 3D Z
		direction.z = -direction.y ;
		direction.y = 0 ;
		direction.normalize() ;
		direction.y = 0.6 ;   // Force throwing a bit in the up direction
		direction.normalize() ;

		try {
			result = await this.throwDice( power , direction ) ;
			await this.displayDiceRollResult( result ) ;
		}
		catch ( error ) {
			this.destroy() ;
			promise.reject( error ) ;
			return ;
		}

		this.destroy() ;
		promise.resolve( result ) ;
	} ;

	var buildPower = () => {
		if ( startAt ) { return ; }
		scene.onPointerDown = null ;
		startAt = Date.now() ;

		var growing = 4 * refreshTimeout / this.maxPowerDuration ;
		intervalTimer = setInterval( () => {
			arrow.scaling.x += growing ;
			//arrow.position.x += growing * 0.5 * this.arrowLength ;
			var dnorm = direction.normalizeToNew() ;
			arrow.rotation.y = Math.atan2( dnorm.y , dnorm.x ) ;
			if ( Date.now() - startAt > this.maxPowerDuration ) { release() ; }
		} , refreshTimeout ) ;

		scene.onPointerMove = ( event ) => {
			direction.x += event.movementX ;
			direction.y += event.movementY ;
		} ;

		scene.onPointerUp = release ;
	} ;

	scene.onPointerDown = buildPower ;
	setTimeout( buildPower , 2000 ) ;

	return promise ;
} ;



DiceRoller.prototype.throwDice = async function( power , direction ) {
	var result = {} ,
		scene = this.babylon.scene ;

	power = this.maxThrowingPower * power + this.minThrowingPower * ( 1 - power ) ;

	for ( let i = 0 ; i < this.dieCount ; i ++ ) {
		let die = this.babylon.dice[i] ;
		die.physicsImpostor = new BABYLON.PhysicsImpostor( die , BABYLON.PhysicsImpostor.BoxImpostor , { mass: 1 , restitution: this.restitution , friction: this.friction } , scene ) ;
		die.physicsImpostor.setLinearVelocity( new BABYLON.Vector3( power * direction.x , power * direction.y , power * direction.z ) ) ;
	}

	var startAt = Date.now() ;

	do {
		if ( this.babylon.dice.every( die => this.isStill( die ) ) ) { break ; }
		await Promise.resolveTimeout( 100 ) ;
	} while ( Date.now() - startAt < this.diceRollTimeLimit ) ;

	result.dice = this.babylon.dice.map( die => this.getDieFace( die ) ) ;
	result.sum = 0 ;
	if ( this.faceValues ) {
		result.values = result.dice.map( faceIndex => {
			var v = this.faceValues[ faceIndex ] ;
			if ( typeof v === 'number' ) { result.sum += v || 0 ; }
			else if ( typeof v !== 'string' ) { v = null ; }
			return v ;
		} ) ;
	}

	console.warn( "Dice roll: " , result ) ;
	return result ;
} ;



DiceRoller.prototype.isStill = function( object ) {
	var body = object.physicsImpostor.physicsBody ;
	var sum = Math.abs( body.velocity.x ) + Math.abs( body.velocity.y ) + Math.abs( body.velocity.z ) +
		Math.abs( body.angularVelocity.x ) + Math.abs( body.angularVelocity.y ) + Math.abs( body.angularVelocity.z ) ;
	console.warn( "velocity sum:" , sum ) ;
	return sum < this.stillnessVelocitySumLimit ;
} ;



DiceRoller.prototype.getDieFace = function( die ) {
	var faceIndex = meshUtils.getUpmostBoxMeshFace( die ) ;
	return this.dieFaceReindex[ faceIndex ] ;
} ;



DiceRoller.prototype.displayDiceRollResult = function( result ) {
	var ui = this.babylon.ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI( "UI" ) ;

	var rect = new BABYLON.GUI.Rectangle() ;
	rect.width = 0.2 ;
	rect.height = "40px" ;
	rect.cornerRadius = 20 ;
	rect.color = "orange" ;
	rect.thickness = 4 ;
	rect.background = "green" ;
	ui.addControl( rect ) ;    	

	var text = new BABYLON.GUI.TextBlock() ;
	text.text = result.values.join( '+' ) + ' = ' + result.sum ;
	text.color = "white" ;
	text.fontSize = 24 ;
	rect.addControl( text ) ;

	return Promise.resolveTimeout( 2000 ) ;
} ;

