/*
Copyright - 2024 2025 - wwwouaiebe - Contact: https://www.ouaie.be/

This  program is free software;
you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation;
either version 3 of the License, or any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
/*
Changes:
	- v1.0.0:
		- created
Doc reviewed ...
*/
/* ------------------------------------------------------------------------------------------------------------------------- */

import process from 'process';
import fs from 'fs';
import crypto from 'crypto';
import { ESLint } from 'eslint';
import { rollup } from 'rollup';
import { minify } from 'terser';
import stylelint from "stylelint";
/**
 * Simple constant for 0
 * @type {Number}
 */

const ZERO = 0;

/**
 * Simple constant for 1
 * @type {Number}
 */

const ONE = 1;

/**
 * Simple constant for -1
 * @type {Number}
 */

const MINUS_ONE = -1;

/* ------------------------------------------------------------------------------------------------------------------------- */
/**
 * A class for building the app
 */
/* ------------------------------------------------------------------------------------------------------------------------- */

class AppBuilder {

	/**
	 * A temporary directory
	 * @type {String}
	 */

	#tmpDir	= './tmp/';

	/**
	 * A boolean indicationg that the app must be build in debug mode (= without rollup and terser)
	 * @type {Boolean}
	 */

	#type;

	/**
	 * The start time of the build
	 * @type {Number}
	 */

   	#startTime;

	/**
	 * The contains of the package.json file
	 * @type {Object}
	 */

	#packageJson;

	/**
	 * The contains of the AppBuilder.json file
	 * @type {Object}
	 */

	#appBuilderJson;

	/**
	 * The sha386 hash for the css file
	 * @type {String}
	 */

	#cssHash;

	/**
	 * The sha386 hash for the js file
	 * @type {String}
	 */

	#jsHash;

	/**
	 * The current build
	 * @type {Object}
	 */

	#currentTask;

    /**
	Validate a dir:
	- Verify that the dir exists on the computer
	- verify that the dir is a directory
	- complete the dir with a \
	@param {String} dir The path to validate
	@returns {String|null} the validated dir or null if the dir is invalid
	*/

	#validateDir ( dir ) {
		let returnDir = dir;
		if ( '' === returnDir ) {
			return null;
		}

		try {
			if ( ! fs.existsSync ( returnDir ) ) {
				fs.mkdirSync ( returnDir )
			}
			return returnDir;
		}
		catch ( error ) {
			console.error ( error );
			return null;
		}
	}

	/**
	 * Read the config parameters
	 */

	#createConfig ( ) {

		process.exitCode = ZERO;

		try {
			this.#appBuilderJson = JSON.parse ( fs.readFileSync ( './AppBuilder.json', 'utf8' ) );
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
			return;
		}

		process.argv.forEach (
			arg => {
				const argContent = arg.split ( '=' );
				switch ( argContent [ ZERO ] ) {
				case '--type' :
					this.#type = argContent [ ONE ];
					break;
				default :
					break;
				}
			}
		);
	}

	/**
	 * Read the package.json file
	 */

	#readPackage ( ) {
		try {
			this.#packageJson = JSON.parse ( fs.readFileSync ( 'package.json' ) );
			this.#packageJson.buildNumber ++;
			Object.freeze ( this.#packageJson );
			return;
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
			return;
			}
	}

	/**
	 * Write the package.json file
	 */

	#writePackage ( ) {
		if ( ONE === process.exitCode ) {
			return;
		}

		try {
			// eslint-disable-next-line no-magic-numbers
			fs.writeFileSync ( 'package.json', JSON.stringify ( this.#packageJson, null, 4 ) );
		}
		catch (error ) {
			console.error ( error );
			process.exitCode = ONE;
		}
	}

	/**
	 * Some actions at the startup of the build
	 */

	#start ( ) {
		this.#startTime = process.hrtime.bigint ( );
		// eslint-disable-next-line max-len
		console.error ( `\x1b[30;101m Start build of  ${this.#packageJson.name} - ${this.#packageJson.version} - ${new Date ( ).toString ( )}\x1b[0m` );
	}

	/**
	 * Some actions at the end of the build
	 */

	#end ( ) {

		console.error ( '\n\n' );

		this.#writePackage ( );

		// end of the process
		const deltaTime = process.hrtime.bigint ( ) - this.#startTime;

		/* eslint-disable-next-line no-magic-numbers */
		const execTime = String ( deltaTime / 1000000000n ) + '.' + String ( deltaTime % 1000000000n ).substring ( ZERO, 3 );
		if ( ZERO === process.exitCode ) {
			console.error ( `\n\x1b[36mTime taken ${execTime} seconds\n\n\x1b[0m` );
			// eslint-disable-next-line max-len
			console.error ( `\x1b[30;42m ${this.#packageJson.name} - ${this.#packageJson.version} - build ${this.#packageJson.buildNumber} - ${new Date ( ).toString ( )}\x1b[0m` );
		}
		else {
			console.error ( `\n\x1b[30;101mBuild canceled after ${execTime} seconds - errors occurs\x1b[0m` );
		}
		console.error ( '\n\n' );
	}

	/**
	 * Run ESLint
	 */

	async #runESLint ( ) {
		if ( ( ! this.#appBuilderJson.ESLintFiles ) || ZERO === this.#appBuilderJson.ESLintFiles.length ) {
			return;
		}

		console.error ( '\n\nRunning ESLint' );
		try {
			const eslint = new ESLint (
				 {
					fix : true,
					fixTypes : [ 'directive', 'problem', 'suggestion', 'layout' ]
				}
			);
			const results = await eslint.lintFiles (  this.#appBuilderJson.ESLintFiles );
			await ESLint.outputFixes ( results );
			const formatter = await eslint.loadFormatter ( 'stylish' );
			const resultText = formatter.format ( results );
			console.error ( resultText );
			let errorCount = 0
			results.forEach ( 
				result => errorCount += result.errorCount
			);
			if ( ZERO !== errorCount ) {
				process.exitCode = ONE;
			}
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
		}
	}

	/**
	 * Run StyleLint
	 */

	async #runStyleLint ( ) {
		if ( ( ! this.#appBuilderJson.styleLintFiles ) || ZERO === this.#appBuilderJson.styleLintFiles.length ) {
			return;
		}

		console.error ( '\n\nRunning StyleLint' );

		try {
			const { default : rules }  = await import ( './StyleLintConfig.js' );
			const result = await stylelint.lint(
				{
					files : this.#appBuilderJson.styleLintFiles,
					config : rules,
					formatter : 'string'
				}
			);
			console.error ( result.report );
			if ( MINUS_ONE !== result.report.indexOf ( 'error' ) ) {
				process.exitCode = ONE;
			}
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
		}

	}

	/**
	 * Clean directories
	 */

	#cleanDirs ( ) {
		console.error ( '\n\nCleaning dirs' );
		this.#currentTask.cleanDirs.forEach (
			cleanDir => {
				fs.rmSync ( cleanDir, { recursive : true, force : true } );
				fs.mkdirSync ( cleanDir );
			}
		);
	}

	/**
	 * Clean the temporary directory
	 */

	#cleanTmp ( ) {
		fs.rmSync ( this.#tmpDir, { recursive : true, force : true } );
	}

	/**
	 * Run Rollup
	 */

	async #runRollup ( ) {
		console.error ( '\n\tRunning Rollup' );

		try {
			const bundle = await rollup ( { input : this.#currentTask.jsFile } );
			await bundle.write (
				{
					file : this.#tmpDir + this.#currentTask.name + '.js',
					format : 'iife'
				}
			);
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode =ONE;
		}
	}

	/**
	 * Run Terser and compute the hash for the js file
	 */

 	async #runTerser ( ) {
		console.error ( '\n\tRunning Terser' );
		const preamble =
			'/**\n * ' +
			'\n * @source: ' + this.#packageJson.sources + '\n * ' +
			'\n * @licstart  The following is the entire license notice for the' +
			'\n * JavaScript code in this page.\n * \n * ' + this.#packageJson.name + ' - version ' +
			this.#packageJson.version +
			'\n * Build ' + this.#packageJson.buildNumber + ' - ' + new Date ( ).toString ( ) +
			'\n * Copyright 2019 ' + new Date ( ).getFullYear ( ) + ' wwwouaiebe ' +
			'\n * Contact: https://www.ouaie.be/' +
			'\n * License: ' + this.#packageJson.license +
			'\n * \n * The JavaScript code in this page is free software: you can' +
			'\n * redistribute it and/or modify it under the terms of the GNU' +
			'\n * General Public License (GNU GPL) as published by the Free Software' +
			'\n * Foundation, either version 3 of the License, or (at your option)' +
			'\n * any later version.  The code is distributed WITHOUT ANY WARRANTY;' +
			'\n * without even the implied warranty of MERCHANTABILITY or FITNESS' +
			'\n * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.' +
			'\n * \n * As additional permission under GNU GPL version 3 section 7, you' +
			'\n * may distribute non-source (e.g., minimized or compacted) forms of' +
			'\n * that code without the copy of the GNU GPL normally required by' +
			'\n * section 4, provided you include this license notice and a URL' +
			'\n * through which recipients can access the Corresponding Source.' +
			'\n * \n * @licend  The above is the entire license notice' +
			'\n * for the JavaScript code in this page.' +
			'\n * \n */\n\n';

		try {
			let result = await minify (
				fs.readFileSync ( this.#tmpDir + this.#currentTask.name + '.js', 'utf8' ),
				{
					format : { preamble : preamble },
					mangle : true,
					compress : true,
					// eslint-disable-next-line no-magic-numbers
					ecma : 2025
				}
			);

			this.#jsHash = crypto.createHash ( 'sha384' )
				.update ( result.code, 'utf8' )
				.digest ( 'base64' );

			fs.writeFileSync (
				this.#currentTask.destDir + this.#currentTask.name + '.min.js',
				result.code,
				'utf8'
			);
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode =ONE;
		}
	}

	/**
	 * Clean a css string, removing lines break, tabs, multiple white spaces and comments
	 * @param {String} cssString The css string to clean
	 * @returns {String} the cleaned css string
	 */

	#cleanCss ( cssString ) {
		let tmpCssString = cssString
			.replaceAll ( /\r/g, ' ' )
			.replaceAll ( /\n/g, ' ' )
			.replaceAll ( /\t/g, ' ' )
			.replaceAll ( /: /g, ':' )
			.replaceAll ( / :/g, ':' )
			.replaceAll ( / {/g, '{' )
			.replaceAll ( / {2,}/g, '' )
			.replaceAll ( /\u002F\u002A.*?\u002A\u002F/g, '' );

		return tmpCssString;
	}

	/**
	 * Build the css file and compute the hash
	 */

	#buildStyles ( ) {
		console.error ( '\n\tBuilding CSS' );

		try {
			let cssString = '';

			this.#currentTask.cssFiles.forEach (
				cssFile => {
					cssString += fs.readFileSync ( cssFile, 'utf8' );
				}
			);

			if ( 'release' === this.#type ) {
				cssString = this.#cleanCss ( cssString );
			}

			this.#cssHash = crypto.createHash ( 'sha384' )
				.update ( cssString, 'utf8' )
				.digest ( 'base64' );

			fs.writeFileSync ( this.#currentTask.destDir + this.#currentTask.name + '.min.css', cssString );
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode =ONE;
		}
	}

	/**
	 * Build the html file:
	 * - replace the hash values in the <script> and <link> tags
	 * - remove the comments
	 * - remove line break, tab and multiple spaces
	 */

	#buildHTML ( ) {
		console.error ( '\n\tBuilding HTML' );

		try {
			let htmlString = fs.readFileSync ( this.#currentTask.htmlFile, 'utf8' );

			if ( this.#jsHash ) {
				const scriptTag = '<script src="' + this.#currentTask.name + '.min.js' +
				'" integrity="sha384-' + this.#jsHash + '" crossorigin="anonymous" ></script>';
				htmlString =
					htmlString.replaceAll ( RegExp ( '<script src="main.js" type="module"></script>', 'g' ), scriptTag )
			}
			if ( this.#cssHash ) {
				const cssTag = '<link rel="stylesheet" href="' + this.#currentTask.name + '.min.css' +
				'" integrity="sha384-' + this.#cssHash + '" crossorigin="anonymous" />';
				htmlString =
					htmlString.replaceAll ( RegExp ( '<link rel="stylesheet" href="EncryptDecrypt.css" />', 'g' ), cssTag );
			}

			htmlString =
				htmlString.replaceAll ( /<!--.*?-->/g, '' )
					.replaceAll ( /\r\n|\r|\n/g, ' ' )
					.replaceAll ( /\t/g, ' ' )
					.replaceAll ( / {2,}/g, ' ' );

			fs.writeFileSync ( this.#currentTask.destDir + this.#currentTask.htmlFile.split ( '/') .pop ( ), htmlString );
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode =ONE;
		}
	}

	/**
	 * Copy files...
	 */

	#copyFiles ( ) {
		console.error ( '\n\tcopying files' );
		try {
			this.#currentTask.copyFiles.forEach (
				fileDesc => {
					const stat = fs.lstatSync ( fileDesc.src );
					if ( stat.isDirectory ( ) ) {
						fs.cpSync ( fileDesc.src, fileDesc.dest, { recursive : true } );
					} else if ( stat.isFile ( ) ) {
						const dirDest = fileDesc.dest.slice ( 0, fileDesc.dest.lastIndexOf ( '/' ) + 1 );
						fs.mkdirSync ( dirDest, { recursive : true } );
						fs.copyFileSync ( fileDesc.src, fileDesc.dest );
					}
				}
			)
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode =ONE;
		}
	}

	/**
	 * Coming soon
	 */

	async #buildTask ( ) {
		if ( this.#type !== this.#currentTask.type ) {
			return
		}

		if ( this.#currentTask.cleanDirs ) {
			this.#cleanDirs ( );
		}
		console.error ( '\n\nBuilding task ' + this.#currentTask.name );
		this.#cssHash = null;
		this.#jsHash = null;
		this.#cleanTmp ( );

		this.#currentTask.destDir = this.#validateDir ( this.#currentTask.destDir );
		if ( ! this.#currentTask.destDir ) {
			console.error ( 'Invalid path for the --dest parameter \x1b[31m%s\x1b[0m' );
			process.exitCode = ONE;
		}

		if ( ONE === process.exitCode ) {
			return;
		}

		if ( this.#currentTask.jsFile) {
			fs.mkdirSync ( this.#tmpDir );
			await this.#runRollup ( );
			if ( ONE === process.exitCode ) {
				return;
			}
			await this.#runTerser ( );
			if ( ONE === process.exitCode ) {
				return;
			}
			this.#cleanTmp ( );
		}

		if ( ZERO !== this.#currentTask.cssFiles.length ) {
			this.#buildStyles ( );
			if ( ONE === process.exitCode ) {
				return;
			}
		}

		if ( this.#currentTask.htmlFile ) {
			this.#buildHTML ( );
			if ( ONE === process.exitCode ) {
				return;
			}
		}

		if ( ZERO !== this.#currentTask.copyFiles.length ) {
			this.#copyFiles ( );
			if ( ONE === process.exitCode ) {
				return;
			}
		}
	}

	/**
	 * Build the app
	 */

	async build ( ) {

		this.#readPackage ( );
		if ( ONE === process.exitCode ) {
			this.#end ( );
			return;
		}

		this.#start ( );

		this.#createConfig ( );
		if ( ONE === process.exitCode ) {
			this.#end ( );
			return;
		}

		await this.#runESLint ( );
		if ( ONE === process.exitCode ) {
			this.#end ( );
			return;
		}

		await this.#runStyleLint ( );
		if ( ONE === process.exitCode ) {
			this.#end ( );
			return;
		}

		for ( const task of  this.#appBuilderJson.tasks ) {
				this.#currentTask = task; 
				await this.#buildTask ( );
				if ( ONE === process.exitCode ) {
					break;
				}
		}

		this.#end ( );
	}

	/**
	 * The constructor
	 */

	constructor ( ) {
		Object.freeze ( this );
	}
}

new AppBuilder ( ).build ( );

/* --- End of file --------------------------------------------------------------------------------------------------------- */