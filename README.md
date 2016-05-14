#MPGInfo.js

   Sort of "Mediainfo" for MPEG (1 & 2) Files (.mpeg, .mpg, .vob )- little MPEGParser (just for main technics information about the file)

#Dependances : null

#Usage :

    <script src="MPGInfo.js" type="text/javascript" charset="utf-8"></script> <-- or MPGInfo_min.js -->
    (in single file .html)

    importScripts('MKVInfo.js');                                              <-- or MPGInfo_min.js -->                                        
    (in worker)


#How use it :

     
            mpg(this.files[0], speedy, function(err, info) {
                if (err) {
                    .....
                } else {
                    sortie_texte = human_reading(info);
                    ....
                }
            }); 

  MPGInfo return an object structured (named 'info') which contains a lot of technicals information about the file.
  If we want to read this informations, we need to make them readable. So human_reading is here !
  
  There is an option : speedy ! If speedy is false, MPGInfo will be slow ... perhaps very slow. But complete.
  
  If speedy is true, only the begining and the ending of the file will be parsed. So, perhaps some details will be forgotten like subtitles and/or sizes ... bitrates !
  
  If the file is a .VOB file (from DVD), MPGInfo will try to parse it because .VOB file is a MPEG-2 particuliar file. In that case, MPGInfo will say "it's an DVD file" ;)
  
  Documentations are written in the begin of MPGInfo.js. It's possible that some of them are unnecessary : they concerned MPEG-TS files

#Examples :
	
	for a single file and no worker : index.html
	for multiple files and worker   : indexw.html

#Try it ? 
    http://aroug.eu/MPGInfo/   (multiple + worker + use MPGInfo.min.js)   
