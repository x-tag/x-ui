module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint:{
      all: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },
    'smush-components': {
      options: {
        fileMap: {
          js: 'ui/js/x-tag-components.js',
          css: 'ui/css/x-tag-components.css'
        }
      }
    },
    /*watch: {
      stylus: {
        files: ['src/styl/*'],
        tasks: ['stylus']
      }
    },*/
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
    },
    concat: {
      lightTheme: {
        src: ['src/light.css'],
        dest: 'ui/css/light-theme.css'
      },
      darkTheme: {
        src: ['src/dark.css'],
        dest: 'ui/css/dark-theme.css'
      }
    },
    copy: {
      ui: {
        files: [{expand: true, flatten: true, src: ['src/images/*'], dest: 'ui/images/' }]
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-smush-components');

  grunt.registerTask('build', ['smush-components']);
  grunt.registerTask('build-light', ['stylus:light','concat:lightTheme']);
  grunt.registerTask('build-dark', ['stylus:dark','concat:darkTheme']);


};