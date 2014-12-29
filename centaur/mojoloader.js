/*globals PalmSystem palmGetResource _mojoRequire palmRequire */
/*jslint evil: true */

var MojoLoader;
if (!MojoLoader)
{
	MojoLoader =
	{
		/*
		 * The list of paths we use to search for a given library/framework.
		 * We search the system install paths first, and if that fails, look in a local path
		 * within the given library.
		 */
		_palmPath: [ "/usr/palm/frameworks/private/", "/usr/palm/frameworks/", "frameworks/" ],
		_publicPath: [ "/usr/palm/frameworks/", "frameworks/" ],
		_tritonPath: [ "" ],
		_path: undefined,
	
		/*
		 * A set of library version overrides.  If we want to force a specific library to be loaded
		 * then we insert it here.  This is used to debug new versions/submissions.
		 */
		_override: {},
	
		_loaded: {},
	
		_root: this,
	
		/*
		 * Define the environment of the loader.
		 */
		_env: (typeof document !== "undefined" ? "mojo" : "triton"),
		_isPalm: (typeof PalmSystem === "undefined" || PalmSystem.identifier.indexOf("com.palm.") === 0),
	
		/*
		 * The current root of this module (the current directory by default)
		 */
		root: "./",
	
		/*
		 * Allow the specified frameworks versions to be overridden.
		 */
		override: function()
		{
		    console.log("@@@ override @@@");
		    
			for (var i = 0; i < arguments.length; i++)
			{
				var arg = arguments[i];
				this._override[arg.name] = this._getVersion(arg);
			}
		},

		/*
		 * Specify what libraries we require.  The function takes the following form:
		 *
		 *   var libs = MojoLoader.require({ name: "mylibrary", version: "1.0" }, { name: "Mojo.UI", submission: "123" });
		 *   libs["mylibrary"].doit();
		 * 
		 * The function takes a list of name/versions for each framework we require and returns an object which has a 
		 * property for the exports of each loaded framework.
		 */
		require: function()
		{
		    console.log("@@@ require @@@ - _env:"+this._env+", _isPalm:"+this._isPalm);
		    
			var libs = {};
			// We dont load into lightweight windows (except in a real browser)         
			if (this._env == "mojo" && window.opener && Mojo.hasPalmGetResource)
			{                           
				return libs;               
			}

			// Foreach library to load ...
			var alen = arguments.length;
			for (var a = 0; a < alen; a++)
			{
				// Split out the library name and version
				var arg = arguments[a];
				var name = arg.name;
				if (!name)
				{
					throw new Error("Missing library name");
				}
				var version = this._getVersion(arg);
				if (!version)
				{
					throw new Error("Library " + name + ": Missing version");
				}

				// Dont load library if its already loaded
				var library = this._loaded[name];
				if (!library)
				{
					this._loaded[name] = library = { name: name, version: version, exports: {}, loaded: false, pending: [] };
					// Load the library into a container
					this._loadLibraryIntoContainer(library);
				}
				// If library is loaded, make sure its the same version we want
				else if (library.version != version)
				{
					throw new Error("Library " + name + ": Dependency conflict (want '" + version + "' but already loaded '" + library.version + "')");
				}

				// Get the library export object
				libs[name] = library.exports;
			}
	
			// They're all loaded
			return libs;
		},
	
		_getVersion: function(arg)
		{
		    console.log("@@@ _getVersion @@@");
		    
			if (this._override[arg.name])
			{
				return this._override[arg.name];
			}
			else if (arg.version)
			{
				return "version/" + arg.version;
			}
			else if (arg.submission)
			{
				return "submission/" + arg.submission;
			}
			else if (arg.trunk)
			{
				return "trunk";
			}
			else
			{
				return undefined;
			}
		},
	
		_loadLibraryUsingEval: function(library, base, manifest)
		{
		    console.log("@@@ _loadLibraryUsingEval @@@ library:"+Object.toJSON(library)+", base:"+Object.toJSON(base)+",manifest:"+Object.toJSON(manifest));
		    
			var lname = "__MojoFramework_" + library.name;
			var jbase = base + "javascript/";
			var sources = manifest.files.javascript;
			var slen = sources.length;
			var data = "this._root[lname] = function(MojoLoader, exports, root) {";
			for (var i = 0; i < slen; i++)
			{
				data += palmGetResource(jbase + sources[i]);
			}
			data += "}";
			console.log(" ### data: " + data);
			console.log("%%%% before eval %%%%");
			try {
			eval(data);
			} catch (err) { 
			    console.log("SHIT SHIT SHIT: " + err); 
			}
			console.log("%%%% after eval %%%%");
			this._root[lname](this._newLoader(base), library.exports, this._root);
			console.log("#### after invoke ####");
		},
		
		_loadLibrary: function(library, base, manifest)
		{
		    console.log("@@@ _loadLibrary @@@");
		    
		    console.log("*** _loadLibrary - library:" + Object.toJSON(library) + ", base:" + Object.toJSON(base) + ", manifest:" + Object.toJSON(manifest) + " ***");
		    
			var jbase = base + "javascript/";
			var paths = [];
			var sources = manifest.files.javascript;
			var slen = sources.length;
			for (var i = 0; i < slen; i++)
			{
				paths.push(jbase + sources[i]);
			}
			library.exports = this._propogateGlobals(this._require(this._newLoader(base), paths), this._root).exports;
		},
		
		_propogateGlobals: function(to, from)
		{
		    console.log("@@@ _propagateGlobals @@@");
		    
			var syms = [ 
				/* Common */ 	"console", "palmGetResource", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
				/* Triton */	"getenv", "readInput", "quit", "include", "_mojoRequire", "webOS", "palmPutResource",
				/* Mojo */		"XMLHttpRequest", "palmRequire", "palmInclude", "PalmServiceBridge", "PalmSystem"
			];
			var len = syms.length;
			for (var i = 0; i < len; i++)
			{
				var sym = syms[i];
				if (sym in from && !(sym in to))
				{
					to[sym] = from[sym];
				}
			}
			return to;
		},

		/*
		 * Search the path and load the library into a container.
		 * The container (an iframe) is used to isolate the global library from the rest
		 * The library executes the callback once its has been loaded.
		 */
		_loadLibraryIntoContainer: function(library)
		{
		    console.log("@@@ _loadLibraryIntoContainer @@@");
		    
			var name = library.name;
			var version = library.version;
			var path = this._path;

			// Work out the path to the library on the file system
			for (var pathidx = 0; pathidx < path.length; pathidx++)
			{
				var base = path[pathidx] + name + "/";
				var vbase = base + version + "/";
				try
				{
					console.log("*** Loading", vbase + "manifest.json ***");
					var manifest = eval("(" + palmGetResource(vbase + "manifest.json") + ")");	
					// Handle submission aliases
					if (manifest.submission)
					{
						vbase = base + "submission/" + manifest.submission + "/";
					}
					try
					{
						return this._loadLibrary(library, vbase, manifest);
					}
					catch (e)
					{
						//console.log(e.stack || e);
						console.log("XXX _loadLibraryIntoContainer - _loadLibrary threw an exception: " + Object.toJSON(e) + " XXX");
					}
				}
				catch (_)
				{
				}
			}
			throw new Error("Failed to load library '" + name + "' version '" + version + "' paths '" + (path[0] !== "" ? path.join(",") : "<command line>") +  "'");
		},

		_newLoader: function(root)
		{
		    console.log("@@@ _newLoader @@@");
		    
			var self = this;
			return {
				root: root,

				require: function()
				{
					return self.require.apply(self, arguments);
				},
			
				override: function()
				{
					return self.override.apply(self, arguments);
				}
			};
		},
		
		_selectLoader: function()
		{
		    console.log("@@@ _selectLoader @@@");
		    
			if (typeof _mojoRequire !== "undefined") 
			{
				this._require = _mojoRequire;
			}
			else if (typeof palmRequire !== "undefined")
			{
				this._require = palmRequire;
			}
			else
			{
			    if (this._env == 'mojo' && typeof palmGetResource === "undefined") 
				//if (this._env === 'mojo') 
				{
				    console.log("  _selectLoader: setting palmGetResource ...");
				    
					palmGetResource = function(pathToResource) 
					{
						var req = new XMLHttpRequest();
						req.open('GET', pathToResource + "?palmGetResource=true", false); 
						req.send(null);
						return req.responseText;
					};
				}
				this._loadLibrary = this._loadLibraryUsingEval;
			}
		}
	};
	MojoLoader._selectLoader();
	MojoLoader._path = MojoLoader._env === "triton" ? MojoLoader._tritonPath : MojoLoader._isPalm ? MojoLoader._palmPath : MojoLoader._publicPath;
} // end if (!MojoLoader)
