module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint:{
      all: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },
    'smush-components': {
      options: {
        fileMap: {
          js: 'ui/x-tag-components.js',
          css: 'ui/x-tag-components.css'
        }
      }
    },
    /*watch: {
      stylus: {
        files: ['src/styl/*'],
        tasks: ['stylus']
      }
    },*/
    bumpup: ['component.json', 'package.json', 'xtag.json'],
    tagrelease: {
      file: 'package.json',
      prefix: 'xtag-v',
      commit: true
    }, 
    stylus:{     
      light: {
        options:{
          define: {
            theme: 'light'
          },
        },
        files:{
          'src/light.css': ['src/styl/main.styl']
        }
      },
      dark: {
        options:{
          define: {
            theme: 'dark'
          },
        },
        files: {
          'src/dark.css': ['src/styl/main.styl']
        }
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-smush-components');

  grunt.registerTask('build', ['smush-components','stylus']);
  grunt.registerTask('bump:patch', ['bumpup:patch', 'tagrelease']);


};