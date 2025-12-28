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

/* eslint-disable max-lines */

import process from 'process';
import fs from 'fs';
import crypto from 'crypto';
import { ESLint } from 'eslint';
import { rollup } from 'rollup';
import { minify } from 'terser';
import stylelint from 'stylelint';

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
	 * The css tags that have to be added in the next html file
	 * @type {String}
	 */

	#cssTags;

	/**
	 * The js tags that have to be added in the next html file
	 * @type {String}
	 */

	#jsTags;

	/**
	 * The current build
	 * @type {Object}
	 */

	#currentTask;

	/**
	 * The content of the file AppBuilder.json
	 * @type {Object}
	 */

	#tasks;

	/**
	 * Read the config parameters
	 */

	#createConfig ( ) {

		process.exitCode = ZERO;

		try {
			this.#tasks = JSON.parse ( fs.readFileSync ( './AppBuilder.json', 'utf8' ) );
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
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
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
		catch ( error ) {
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
		console.error ( `\x1b[30;101m Start build of  ${this.#packageJson.name} - ${this.#packageJson.version} - ${new Date ( ).toString ( )}\x1b[0m\n\n` );
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
		try {
			const eslint = new ESLint (
				 {
					fix : true,
					fixTypes : [ 'directive', 'problem', 'suggestion', 'layout' ],
					overrideConfigFile : '../AppBuilder/src/eslint.config.js'
				}
			);
			const results = await eslint.lintFiles ( this.#currentTask.ESLintFiles );
			await ESLint.outputFixes ( results );
			const formatter = await eslint.loadFormatter ( 'stylish' );
			const resultText = formatter.format ( results );
			console.error ( resultText );
			let errorCount = 0;
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
		try {
			const { default : rules } = await import ( './StyleLintConfig.js' );
			const result = await stylelint.lint (
				{
					files : this.#currentTask.styleLintFiles,
					config : rules,
					formatter : 'string'
				}
			);
			if ( '' !== result.report ) {
				console.error ( result.report );
				if ( MINUS_ONE !== result.report.indexOf ( 'error' ) ) {
					process.exitCode = ONE;
				}
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
		this.#currentTask.cleanDirs.forEach (
			cleanDir => {
				fs.rmSync ( cleanDir, { recursive : true, force : true } );
				fs.mkdirSync ( cleanDir );
			}
		);
	}

	/**
	 * Write something in a file, creating all the necessary directories
	 * @param {String} fileName The name of the file
	 * @param {String} fileContent The content of the file
	 */

	#writeFile ( fileName, fileContent ) {
		const dirDest = fileName.slice ( ZERO, fileName.lastIndexOf ( '/' ) + ONE );
		fs.mkdirSync ( dirDest, { recursive : true } );
		fs.writeFileSync ( fileName, fileContent, 'utf8' );
	}

	/**
	 * get the preamble to add to js, css and html files
	 * @param {string} docType the doc type for witch the preamble is created (must be 'html' or 'css' or 'JavaScript')
	 * @returns {string } the preamble to use
	 */

	#getPreamble ( docType ) {

		const preamble =
			( 'html' === docType ? '<!--' : '/**' ) +
			'\n * ' +
			'\n * @source: ' + this.#packageJson.sources + '\n * ' +
			'\n * @licstart  The following is the entire license notice for the' +
			'\n * ' + docType + ' code in this page.\n * \n * ' + this.#packageJson.name + ' - version ' +
			this.#packageJson.version +
			'\n * Build ' + this.#packageJson.buildNumber + ' - ' + new Date ( ).toString ( ) +
			'\n * Copyright 2019 ' + new Date ( ).getFullYear ( ) + ' wwwouaiebe ' +
			'\n * Contact: https://www.ouaie.be/' +
			'\n * License: ' + this.#packageJson.license +
			'\n * \n * The ' + docType + ' code in this page is free software: you can' +
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
			'\n * for the ' + docType + ' code in this page.' +
			'\n * \n' + ( 'html' === docType ? '-->' : '*/' ) + '\n\n';

		return preamble;
	}

	/**
	 * Run Rollup and Terser
	 */

	async #runRollupAndTerser ( ) {
		let rollupCode = '';
		try {
			const bundle = await rollup ( { input : this.#currentTask.jsFile.src } );
			const result = await bundle.generate (
				{
					format : 'iife'
				}
			);
			rollupCode = result.output [ ZERO ].code;
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
			return;
		}

		try {
			let result = await minify (
				rollupCode,
				{
					format : { preamble : this.#getPreamble ( 'JavaScript' ) },
					mangle : true,
					compress : true,
					// eslint-disable-next-line no-magic-numbers
					ecma : 2025
				}
			);
			this.#writeFile ( this.#currentTask.jsFile.dest, result.code );

			const jsHash = crypto.createHash ( 'sha384' )
				.update ( result.code, 'utf8' )
				.digest ( 'base64' );
			this.#jsTags += '<script src="' + this.#currentTask.jsFile.htmlPath +
				'" integrity="sha384-' + jsHash + '" crossorigin="anonymous" ></script>';
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
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
		try {
			let cssString = '';
			this.#currentTask.cssFile.src.forEach (
				cssFile => {
					cssString += fs.readFileSync ( cssFile, 'utf8' );
				}
			);
			if ( 'release' === this.#type ) {
				cssString = this.#cleanCss ( cssString );
				cssString = this.#getPreamble ( 'css' ) + cssString;
			}

			this.#writeFile ( this.#currentTask.cssFile.dest, cssString );

			const cssHash = crypto.createHash ( 'sha384' )
				.update ( cssString, 'utf8' )
				.digest ( 'base64' );

			this.#cssTags += '<link rel="stylesheet" href="' + this.#currentTask.cssFile.htmlPath +
			'" integrity="sha384-' + cssHash + '" crossorigin="anonymous" />';
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
		}
	}

	/**
	 * Build the html file:
	 * - replace the hash values in the <script> and <link> tags
	 * - remove the comments
	 * - remove line break, tab and multiple spaces
	 */

	#buildHTML ( ) {
		try {
			let htmlString = fs.readFileSync ( this.#currentTask.htmlFile.src, 'utf8' );
			if ( '' !== this.#cssTags ) {
				htmlString =
						htmlString.replaceAll ( RegExp ( '<link rel="stylesheet" />', 'g' ), this.#cssTags );
				this.#cssTags = '';
			}

			if ( '' !== this.#jsTags ) {
				htmlString =
					htmlString.replaceAll ( RegExp ( '<script></script>', 'g' ), this.#jsTags );
				this.#jsTags = '';
			}

			if ( 'release' === this.#type ) {
				htmlString =
					htmlString.replaceAll ( /<!--.*?-->/g, '' )
						.replaceAll ( /\r\n|\r|\n/g, ' ' )
						.replaceAll ( /\t/g, ' ' )
						.replaceAll ( / {2,}/g, ' ' );
				htmlString = this.#getPreamble ( 'html' ) + htmlString;
			}
			this.#writeFile ( this.#currentTask.htmlFile.dest, htmlString );
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
		}
	}

	/**
	 * Copy files...
	 */

	#copyFiles ( ) {
		try {
			this.#currentTask.copyFiles.forEach (
				fileDesc => {
					const stat = fs.lstatSync ( fileDesc.src );
					if ( stat.isDirectory ( ) ) {
						fs.cpSync ( fileDesc.src, fileDesc.dest, { recursive : true } );
					}
					else if ( stat.isFile ( ) ) {
						const dirDest = fileDesc.dest.slice ( ZERO, fileDesc.dest.lastIndexOf ( '/' ) + ONE );
						fs.mkdirSync ( dirDest, { recursive : true } );
						fs.copyFileSync ( fileDesc.src, fileDesc.dest );
					}
				}
			);
		}
		catch ( error ) {
			console.error ( error );
			process.exitCode = ONE;
		}
	}

	/**
	 * Run a task...
	 */

	async #runTask ( ) {

		console.error ( '\t' + ( this.#currentTask.name || 'Unnamed task' ) + '\n\n' );

		for ( const taskProperty in this.#currentTask ) {
			switch ( taskProperty ) {
			case 'type' :
			case 'name' :
				break;
			case 'ESLintFiles'	:
				await this.#runESLint ( );
				break;
			case 'styleLintFiles' :
				await this.#runStyleLint ( );
				break;
			case 'cleanDirs' :
				this.#cleanDirs ( );
				break;
			case 'jsFile' :
				await this.#runRollupAndTerser ( );
				break;
			case 'copyFiles' :
				this.#copyFiles ( );
				break;
			case 'cssFile' :
				this.#buildStyles ( );
				break;
			case 'htmlFile' :
				this.#buildHTML ( );
				break;
			default :
				console.error ( 'No procedure found for ' + taskProperty );
				process.exitCode = ONE;
				break;
			}
			if ( ONE === process.exitCode ) {
				break;
			}
		}

	}

	/**
	 * Build the app
	 */

	async build ( ) {

		this.#cssTags = '';
		this.#jsTags = '';

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

		for ( const task of this.#tasks ) {
			if ( ! task.type || task.type === this.#type ) {
				this.#currentTask = task;
				await this.#runTask ( );
			}
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