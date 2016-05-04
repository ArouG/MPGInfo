importScripts('MPGInfo_min.js');


        function duree(s) {

            function onetotwo(Pint) {
                if (Pint < 10) {
                    return '0' + Pint.toString();
                } else {
                    return Pint.toString();
                }
            }

            function onetothree(Pint) {
                if (Pint < 10) {
                    return '00' + Pint.toString();
                } else {
                    if (Pint < 100) {
                        return '0' + Pint.toString();
                    } else {
                        return Pint.toString();
                    }
                }
            }

            var out = '';
            var lhh = '';
            var lmn = '';
            var lss = '';
            var lms = '';
            lhh = Math.floor(s / 3600);
            lmn = Math.floor((s - lhh * 3600) / 60);
            lss = Math.floor(s - lhh * 3600 - lmn * 60);
            lms = Math.ceil((s - lhh * 3600 - lmn * 60 - lss) * 1000);
            if (lhh > 0) {
                lhh = lhh.toString() + ":";
                out = lhh;
            }
            if (lmn > 0) {
                if (out.length == 0) {
                    out = lmn.toString() + ":";
                } else {
                    out = out + onetotwo(lmn) + ":";
                }
            } else {
                if (out.length > 0) {
                    out = out + "00:";
                }
            }
            if (lss > 0) {
                if (out.length == 0) {
                    out = lss.toString();
                } else {
                    out = out + onetotwo(lss);
                }
            } else {
                if (out.length == 0) {
                    out = "0";
                } else {
                    out = out + "00";
                }
            }
            if (lms != 0) {
                out = out + '.' + onetothree(lms);
            }
            return out;
        }

        function humanFileSize(size) {
            var i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['o', 'ko', 'Mo', 'Go', 'To'][i];
        };

        function humanBitrate(size) {
            var i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['bps', 'kbps', 'Mbps', 'Gbps', 'Tbps'][i];
        };

        function human_reading(info) {
            info.text = "ArouG's MPEG Infos :\n";
            info.text += "-------------------\n";
            if (info.speedy){
                info.text += "Mode : Speedy\n";
            } else {
                info.text += "Mode : Complete\n";
            }
            info.text += "File : " + info.filename + "\n";

            var d= new Date(info.filedate);    
            info.text += "Date : " + (d.getFullYear()) + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + "\n";
            info.text += "Size : " + humanFileSize(info.filesize) + "\n";
            info.text += "Version MPEG : "+info.mpgVers+"\n";
            var isDVD = 0
            for (var i =0; i<16; i++) isDVD += info.isDVD[i];
            if (isDVD == 16){
                info.text += "DVDFile : Yes\n";    
            } else {
                info.text += "DVDFile : No\n"; 
            }
            if (info.PSMPackets > 0) info.text += "There is an Program Stream Map \n";
            if (info.ENDPackets > 1) info.text += "ENDPackets : " + info.ENDPackets + " \n";
            if (info.SCRs.length > 0){
                info.text += "-----------------------------------------------------------------\n";
                info.text += "There is (are) Reset Timing :\n";
                var tmp = (((info.SCRs[0][1] * 32768) + info.SCRs[0][2]) - ((info.SCR_deb[1] * 32768) + info.SCR_deb[2])) / 90000;
                tmp = Math.round(1000 * tmp) / 1000;
                info.text += "Part 1 - duration : " + duree(tmp) + "\n";
                for (var j = 1; j < info.SCRs.length-1; j++){
                    tmp = ((info.SCRs[i][1] * 32768) + info.SCRs[i][2]) / 90000;
                    info.text += "Part " + (j+1) + " - duration : " + duree(tmp) + "\n"; 
                }
                tmp = ((info.SCR_end[1] * 32768) + info.SCR_end[2]) / 90000;
                info.text += "Part " + (info.SCRs.length+1) + " - duration : " + duree(tmp) + "\n"; 
                info.text += "-----------------------------------------------------------------\n";
            }
            info.text += "Duration : " + duree(info.dureeS) + "\n";

            var Gbitrate = 0;
            for (var i=0; i<info.Vtracks.length; i++){
                if (info.Vtracks[i].BitRate != 'Variable'){
                    if ((info.mpgVers == 2) && ((info.Vtracks[i].BitRate * info.Vtracks[i].dureeS / 8) > info.filesize)){
                        if (info.speedy){
                            Gbitrate = '?? (speedy !)';  
                            info.Vtracks[i].BitRate = '?? (speedy !)';
                        } else {
                            Gbitrate += (info.Vtracks[i].size / info.Vtracks[i].dureeS * 8);     
                            info.Vtracks[i].BitRate = info.Vtracks[i].size / info.Vtracks[i].dureeS * 8; 
                        }
                    } else {
                        if (Gbitrate != '?? (speedy !)'){
                            Gbitrate += info.Vtracks[i].BitRate; 
                        }    
                        info.Vtracks[i].size = info.Vtracks[i].BitRate * info.Vtracks[i].dureeS / 8;
                    }
                } else {
                    if (info.speedy) {
                        Gbitrate = "?? (speedy !)";
                        info.Vtracks[i].BitRate = "?? (speedy !)";
                    } else {    
                        Gbitrate += (info.Vtracks[i].size / info.Vtracks[i].dureeS * 8); 
                        info.Vtracks[i].BitRate = info.Vtracks[i].size / info.Vtracks[i].dureeS * 8;   
                    }
                }
            }
            for (var i=0; i<info.Atracks.length; i++){
                if (info.Atracks[i].bitrate != '?'){
                    if (Gbitrate != '?? (speedy !)'){
                        Gbitrate += info.Atracks[i].bitrate * 1024; 
                    }    
                    info.Atracks[i].size = info.Atracks[i].bitrate * 128 * info.Atracks[i].dureeS;
                } else {
                    if (Gbitrate != '?? (speedy !)'){
                        Gbitrate += (info.Atracks[i].size / info.Atracks[i].dureeS * 8);
                    }
                    info.Atracks[i].bitrate = info.Atracks[i].size / info.Atracks[i].dureeS;   
                }
            }
            if (Gbitrate != '?? (speedy !)'){
                for (var i=0; i<info.Stracks.length; i++){
                    Gbitrate += info.Atracks[i].bitrate * 1024; 
                }
            }
            if (Gbitrate != '?? (speedy !)'){
                info.text += "Global bitrate : " + humanBitrate(Gbitrate) + "\n";
            } else {
                info.text += "Global bitrate : ?? (speedy !)\n";
            }    
            if (info.Vtracks[0].Vidinfo){
                info.text += "Creator : " + info.Vtracks[0].Vidinfo + "\n";
            }    
            var tot = info.Vtracks.length + info.Atracks.length + info.Stracks.length;
            info.text += "Count of streams : " + tot + "\n";
            info.text += "\n";

            for (var i=0; i<info.Vtracks.length; i++) {
                if (typeof(info.Vtracks[i]) != 'undefined'){
                    info.text += "Video Track Id : " + info.Vtracks[i].id + "\n";
                    if (info.Vtracks[i].BitRate != "?? (speedy !)"){
                        info.text += "Size <= " + humanFileSize(info.Vtracks[i].size) + "\n";
                    } else {
                        info.text += "Size : ?? (speedy !)\n";
                    }    
                    info.text += "Duration : " + duree(info.Vtracks[i].dureeS) + "\n";

                    if (info.Vtracks[i].BitRate != '?? (speedy !)'){
                        info.text += "Bitrate : " + humanBitrate(info.Vtracks[i].BitRate) + "\n"; 
                    } else {
                        info.text += "Bitrate : ?? (speedy !)\n";
                    }    
                    if (info.Vtracks[i].framerate  != 'forbidden'){
                        info.text += "Framerate : " + info.Vtracks[i].framerate + " FPS\n";    
                    }
                    info.text += "Width : " + info.Vtracks[i].width + "\n";
                    info.text += "Heidth : " + info.Vtracks[i].height + "\n";
                    info.text += "\n";
                }
            }
            for (var i=0; i<info.Atracks.length; i++) {
                if (typeof(info.Atracks[i]) != 'undefined'){
                    info.text += "Audio Track Id : " + info.Atracks[i].id + "\n";
                    if (isNaN(info.Atracks[i].layer)){
                        info.text += "codec : " + info.Atracks[i].layer + "\n";
                    } else {
                        info.text += "Layer : " + info.Atracks[i].layer + "\n";
                    }    
                    if (typeof(info.Atracks[i].bettersize) == 'undefined'){
                        info.text += "Size <= " + humanFileSize(info.Atracks[i].size) + "\n";
                    } else {
                        info.text += "Size <= " + humanFileSize(info.Atracks[i].bettersize) + "\n";
                    }       
                    info.text += "Duration : " + duree(info.Atracks[i].dureeS) + "\n";
                    info.text += "Bitrate : " + humanBitrate(info.Atracks[i].bitrate * 1024) + "\n"; 
                    info.text += "Count of channels : ";
                    if (info.Atracks[i].layer == 'AC3'){
                        info.text += info.Atracks[i].AC3Mode[0] + " (" + info.Atracks[i].AC3Mode[1] + ") - " + info.Atracks[i].bsMode + "\n";
                    } else { 
                        if (info.Atracks[i].layer == 'DTS' || info.Atracks[i].layer == 'LCPM') {
                            info.text +=  info.Atracks[i].nbChannels + "\n";      
                        } else {                                                //     'MPEGAudio'
                            if (info.Atracks[i].channels == 'single_channel'){
                                info.text +=  "1" + "\n";     
                            } else {
                                info.text +=  "2" + "\n";    
                            }
                            info.text += "Mode : " + info.Atracks[i].channels + "\n";
                        }
                    }
                    info.text += "Sampling : " + info.Atracks[i].sampling + " kHz\n";
                    info.text += "\n";
                }
            }
            for (var i=0; i<info.Stracks.length; i++) {
                info.text += "Subtitles Track Id : " + info.Stracks[i].id + "\n";
                info.text += "Size <= " + humanFileSize(info.Stracks[i].bettersize) + "\n";   
                info.text += "Duration : " + duree(info.Stracks[i].dureeS) + "\n";
                info.text += "Bitrate : " + humanBitrate(info.Stracks[i].bitrate) + "\n"; 
                info.text += "\n";
            }
            if (info.menu){
                info.text += "There is a menu / navigation\n";
            }
            return info.text;
        }

onmessage = function(event) {

  var file = event.data.MPGfile;
  var speedy = event.data.speedy;
    if (file.type == 'video/mpeg' || file.type == 'video/webm'){ 
        mpg(file, speedy, function(err, info) {
          if (err) {
            console.log('error : ' + err);
            postMessage({
              'data' : 'error : ' + err
            });
          } else {
            sortie_texte = human_reading(info);
            postMessage({
              'data' : sortie_texte
            });
            //console.log(sortie_texte);
          }
        });
    } else {
        postMessage({'data' : 'nop'});
    }    
  }