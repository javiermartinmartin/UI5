/* eslint-disable */
const gulp = require("gulp");
const gulpLivereload = require("gulp-livereload");
const gulpUglify = require("gulp-uglify");
const gulpPrettyData = require("gulp-pretty-data");
const gulpIf = require("gulp-if");
const gulpUi5Preload = require("gulp-ui5-preload");
const proxy = require("http-proxy-middleware");
const gulpConnect = require("gulp-connect");
const gulpImageMin = require("gulp-imagemin");
const imageminJpegRecompress = require("imagemin-jpeg-recompress");
const imageminPngquant = require("imagemin-pngquant");
const del = require("del");
const less = require("gulp-less");
const gulpCopy = require("gulp-copy");
const path = require("path");
const yargs = require("yargs");
const gulpReplace = require("gulp-replace");
const fs = require("fs");
const uuidV1 = require("uuid/v1");
const karma = require("karma");
const ui5uploader = require('gulp-nwabap-ui5uploader');

/* =========================================================== */
/* Tasks                                                       */
/* =========================================================== */

/* =========================================================== */
/* Proxy server & livereload Tasks                             */
/* =========================================================== */

/**
 * SERVER_PROXY contains the server is going to be used by the proxy
 */

const SERVER_PROXY = "http://vsfdap01.mercury.ssp-intl.cloud:8101"; // PRE
const SOURCE_PATH = "./firstApp";
const SCRIPT_PATHS = "./src/**";
const DEST_PATH = "./dist_ops-adjust-stock";
const LOCALHOST = "localhost";
const PORT = 3001;
const IDENTIFICATOR_PROXY = "/sap/";
const PATH_PROXY = "/sap/";

/**
 * Start web server with a proxy
 * SOURCE_PATH: Local folder in development
 * SERVER_PROXY: Variable to define target host
 */
gulp.task("webserver", function(done) {
  var isProduction = yargs.argv.production
    ? yargs.argv.production.toUpperCase()
    : "";

  console.log("Starting webserver task...");

  var sSource = SOURCE_PATH + '/';
  if (isProduction === "TRUE") {
    sSource = DEST_PATH;
  }
  console.log("Working at " + sSource + "...");

  var oProxyOptions = {};
  if (SERVER_PROXY) {
    var filter = function(pathname) {
      return pathname.indexOf(IDENTIFICATOR_PROXY) > -1;
    };
    oPathRewrite = {};
    oPathRewrite[`^${IDENTIFICATOR_PROXY}`] = PATH_PROXY;
    oProxyOptions = proxy(filter, {
      auth: "JMARTIN:Keytree.01",
      target: SERVER_PROXY,
      logLevel: "debug",
      changeOrigin: true,
      secure: false,
      pathRewrite: oPathRewrite
    });
  }

  gulpConnect.server({
    //root: SOURCE_PATH,
    root: sSource + '/webapp',
    directoryListing: true,
    host: LOCALHOST,
    port: PORT,
    middleware: function(connect, opt) {
      return [oProxyOptions];
    }
  });
  done();
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task("tdd", function(done) {
  return new karma.Server(
    {
      configFile: path.join(__dirname, "/karma.local.conf.js")
    },
    function handleKarmaServerExit(processExitCode) {
      if (
        processExitCode === 0 ||
        processExitCode === null ||
        typeof processExitCode === "undefined"
      ) {
        done();
      } else {
        var err = new Error(
          'ERROR: Karma Server exited with code "' + processExitCode + '"'
        );
        done(err);
      }
      process.exit(processExitCode); //Exit the node process
    }
  ).start();
});

/**
 * Script reload task after a change is detected
 */
gulp.task("scripts", function() {
  console.log("Starting reload script task...");
  return gulp.src(SOURCE_PATH).pipe(gulpConnect.reload());
});

/**
 * Watch task to reload webserver
 */
gulp.task("watch", function(done) {
  var isProduction = yargs.argv.production
    ? yargs.argv.production.toUpperCase()
    : "";

  console.log("Starting watch task...");

  if (!isProduction) {
    console.log("Watching at " + SOURCE_PATH + "...");
    gulpLivereload.listen();
    gulp.watch([SOURCE_PATH + "/**/*"], gulp.series("scripts"));
    gulp.watch([SOURCE_PATH + "/**/*.less"], gulp.series("build-less"));
  } else {
    console.log("Nothing to watch...");
  }

  console.log("Finished watch task...");
  done();
});

//Run a http-server, proxying to SCP or other servers if it is needed
//and watch&reload your developmentº=============== */

var PRELOAD_BASE_FOLDER = SOURCE_PATH + "/WebContent";
var PRELOAD_DIST_FOLDER = DEST_PATH;
var PRELOAD_NAMESPACE = "com.ssp.ops.stock";

/**
 * Preload application
 */
gulp.task("ui5preload", function() {
  console.log("Starting ui5 preload task...");

  return gulp
    .src([
      PRELOAD_BASE_FOLDER + "/**/**.+(js|xml|json)",
      //PRELOAD_BASE_FOLDER + "/resources/css/**",
      "!" + PRELOAD_BASE_FOLDER + "/resources/js/**", //Exclude files
      "!" + PRELOAD_BASE_FOLDER + "/test/**" //Exclude files

    ])
    .pipe(gulpIf(PRELOAD_BASE_FOLDER + "**/*.js", gulpUglify())) //only pass .js files to uglify
    .pipe(
      gulpIf(
        PRELOAD_BASE_FOLDER + "**/*.xml",
        gulpPrettyData({
          type: "minify"
        })
      )
    ) // only pass .xml to prettydata
    .pipe(
      gulpUi5Preload({
        base: PRELOAD_BASE_FOLDER,
        namespace: PRELOAD_NAMESPACE
      })
    )
    .pipe(gulp.dest(PRELOAD_DIST_FOLDER + "/WebContent"));

  console.log("Finished ui5 preload task...");
});

var IMAGE_RELATIVE_FOLDER = "/resources/img/*";
var IMAGE_BASE_FOLDER = SOURCE_PATH + IMAGE_RELATIVE_FOLDER;
var IMAGE_DIST_FOLDER = DEST_PATH + "/resources/img";

/**
 * Compression of images
 */
gulp.task("images", function() {
  console.log("Starting images compression task...");

  return gulp
    .src(IMAGE_BASE_FOLDER)
    .pipe(
      gulpImageMin(
        gulpImageMin.gifsicle(),
        gulpImageMin.jpegtran(),
        gulpImageMin.optipng(),
        gulpImageMin.svgo(),
        imageminPngquant(),
        imageminJpegRecompress()
      )
    )
    .pipe(gulp.dest(IMAGE_DIST_FOLDER));

  console.log("Finished images compression task...");
});

var SOURCE_FILES = [
  SOURCE_PATH + "/WebContent/index.html",
  SOURCE_PATH + "/WebContent/*.json",
  SOURCE_PATH + "/WebContent/resources/js/runner.js",
  SOURCE_PATH + "/WebContent/resources/js/lib/**",
  SOURCE_PATH + "/WebContent/resources/i18n/*",
  SOURCE_PATH + "/WebContent/resources/css/*",
  SOURCE_PATH + "/neo-app.json"
  //	SOURCE_PATH + '/resources/js/**',
];

var MOCK_FILES = [
  SOURCE_PATH + "/WebContent/test/mockServer/mockServer.html",
  SOURCE_PATH + "/WebContent/test/mockServer/localService/mockserver.js",
  SOURCE_PATH + "/WebContent/test/mockServer/localService/metadata.xml",
  SOURCE_PATH + "/WebContent/test/mockServer/localService/mockdata/*.json"
]

/**
 * Copy remain files
 */
gulp.task("copy_resources", function() {
  console.log("Starting copying resources task...");

  return gulp.src(SOURCE_FILES).pipe(
    gulpCopy(DEST_PATH, {
      prefix: 1
    })
  );

  console.log("Finished copying resources task...");
});

gulp.task("copy_mock", function() {
  console.log("Starting copying resources task...");

  return gulp.src(MOCK_FILES).pipe(
    gulpCopy(DEST_PATH+"/WebContent", {
      prefix: 1
    })
  );

  console.log("Finished copying resources task...");
});

gulp.task("ui5preload-mock", function() {
  console.log("Starting ui5 preload task...");

  return gulp
    .src([
      PRELOAD_BASE_FOLDER + "/**/**.+(js|xml)",
      "!" + PRELOAD_BASE_FOLDER + "/resources/js/**" //Exclude files
    ])
    .pipe(gulpIf(PRELOAD_BASE_FOLDER + "**/*.js", gulpUglify())) //only pass .js files to uglify
    .pipe(
      gulpIf(
        PRELOAD_BASE_FOLDER + "**/*.xml",
        gulpPrettyData({
          type: "minify"
        })
      )
    ) // only pass .xml to prettydata
    .pipe(
      gulpUi5Preload({
        base: PRELOAD_BASE_FOLDER,
        namespace: PRELOAD_NAMESPACE
      })
    )
    .pipe(gulp.dest(PRELOAD_DIST_FOLDER + "/WebContent"));

  console.log("Finished ui5 preload task...");
});

/**
 * Clean defined distribuition folder
 */
gulp.task("clean", function() {
  console.log("Starting clean destination task...");

  var task = del([DEST_PATH + "/**"]).then(paths => {
    console.log("Deleted files and folders:\n", paths.join("\n"));
  });

  console.log("Finished clean destination task...");

  return task;
});

gulp.task("build-less", () => {
  return gulp
    .src(SOURCE_PATH + "/WebContent/resources/less/styles.less")
    .pipe(
      less({
        paths: [path.join(__dirname, "less", "includes")]
      })
    )
    .pipe(gulp.dest(SOURCE_PATH + "/WebContent/resources/css"));
});

//Inject version number to i18n default property file
gulp.task("injectVersion", function() {
  console.log("Calculating version text...");
  var args = require("yargs").argv,
    sBuild = args.build ? args.build : "",
    oDate = new Date(),
    sDay =
      oDate.getDate().toString().length < 2
        ? "0" + oDate.getDate()
        : oDate.getDate(),
    sMonth =
      (oDate.getMonth() + 1).toString().length < 2
        ? "0" + (oDate.getMonth() + 1)
        : oDate.getMonth(),
    sVersion =
      "v" +
      oDate.getFullYear() +
      "." +
      sMonth +
      "." +
      sDay +
      " (build " +
      sBuild +
      ")";
  console.log("Version text calculated: " + sVersion);
  console.log("Applying version text...");
  return (
    gulp
      .src(SOURCE_PATH + "/WebContent/manifest.json")
      .pipe(gulpReplace("@appVersion", sVersion))
      // whatever else you want to do to index.html...
      .pipe(gulp.dest(DEST_PATH + "/WebContent"))
  );
});

//Run a http-server, proxying to SCP or other servers if it is needed
//and watch&reload your development
//Add livereload extension or JS file at your index file
gulp.task("runserver", gulp.series("build-less", "webserver", "watch", "tdd"));


//Run a http-server, proxying to SCP or other servers if it is needed
//and watch&reload your development
//Add livereload extension or JS file at your index file
gulp.task("runserveronly", gulp.series("webserver", "watch"));

//Run a http-server with karma tests, proxying to SCP or other servers if it is needed
gulp.task("runserveronly-karma", gulp.series("webserver","watch","tdd"));

//Package doing a preload of current application in a defined folder
gulp.task(
  "package",
  gulp.series(
    "clean",
    "build-less",
    "ui5preload",
    "images",
    "copy_resources",
    "injectVersion"
  )
);

gulp.task(
  "mock",
  gulp.series(
    "clean",
    "build-less",
    "ui5preload-mock",
    "images",
    "copy_resources",
    "copy_mock",
    "injectVersion"
  )
);

//Run a deployment to sap system
gulp.task('deploy', function(done) {

  var isPackage = yargs.argv.package ? yargs.argv.package.toUpperCase() : "";
  var isBspContainer = yargs.argv.bspcontainer ? yargs.argv.bspcontainer.toUpperCase() : "";
  var isBspContainerText = yargs.argv.bspcontainertext ? yargs.argv.bspcontainertext.toUpperCase() : "";
  var isPackTransportNo = yargs.argv.packtransportno ? yargs.argv.packtransportno.toUpperCase() : "";
  
  var isUser = yargs.argv.user ? yargs.argv.user.toUpperCase() : "";
  var isPassword = yargs.argv.password;

  var isHost = yargs.argv.host;

  console.log((JSON.stringify(yargs.argv)));

  return gulp.src(DEST_PATH + '/**')
    .pipe(ui5uploader({
        root: DEST_PATH, 
        conn: {
            server: isHost,
        },
        auth: {
            user: isUser,
            pwd: isPassword, 
        },
        ui5: {
            package: isPackage,
            bspcontainer: isBspContainer, 
            bspcontainer_text: isBspContainerText,
            transportno: isPackTransportNo,
        }
    }));
});