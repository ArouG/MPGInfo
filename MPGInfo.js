/**
 * MPGInfo 
 * v 1.0   2016/05/04 
 *
 *       Documentation :
 *                  http://cmm.khu.ac.kr/korean/files/02.mpeg2ts1_es_pes_ps_ts_psi.pdf
 *                  http://www.bretl.com/mpeghtml/MPEGindex.htm
 *                  http://www.pjdaniel.org.uk/mpeg/
 *                  http://www.iem.thm.de/telekom-labor/zinke/mk/mpeg2beg/beginnzi.htm
 *                  history/b66579b5d8cc9f82c813fd99176979bfa88bdfe0/docs/tools.html
 *                  https://github.com/uupaa/MPEG2TS.js
 *                  https://github.com/daniep01/ts-packet-anlayser
 *                  http://dvd.sourceforge.net/dvdinfo/packhdr.html  <== header for MPEG-2
 *                  http://dvd.sourceforge.net/dvdinfo/dvdmpeg.html
 *                  http://andrewduncan.net/mpeg/mpeg-1.html
 *                  http://stnsoft.com/DVD/index.html
 *                  http://stnsoft.com/DVD/mpeg-1_pes-hdr.html
 *                  http://lad.dsc.ufcg.edu.br/multimidia/mpeg2.pdf
 *                  https://en.wikipedia.org/wiki/Packetized_elementary_stream
 *                  https://en.wikipedia.org/wiki/Elementary_stream
 *                  https://www.google.fr/url?sa=t&rct=j&q=&esrc=s&source=web&cd=6&cad=rja&uact=8&ved=0ahUKEwi5ibS7kLrMAhXrL8AKHTxcAqoQFghMMAU&url=http%3A%2F%2Fwww.ece.cmu.edu%2F~ece796%2Fdocuments%2FMPEG-2_Systems_IS.doc&usg=AFQjCNG-cEG0Ls0a09uW8xrURMsmJX0ANw&sig2=sOqKAXGCVbgtEr6xNUAl8g
 *                   TS
 *                  http://www.etherguidesystems.com/help/sdos/mpeg/semantics/mpeg-2/descriptors/Default.aspx
 *                  https://www.nhk.or.jp/strl/publica/bt/en/le0011.pdf
 *                  http://www.keysight.com/upload/cmc_upload/All/6C06MPEGTUTORIAL1.pdf?&cc=FR&lc=fre
 *                  http://ffmpeg.org/doxygen/0.6/index.html  : ffmpeg sources documentation
 *                  
 */
"use strict";

var mpg = function(opts, speedy, mpgcb) {
    var info = {};
    var atoms;
    var options = {
        type: 'uri',
    };
    if (!mpgcb){
        mpgcb = speedy;
        speedy = false;              // by default search in the all file. If speedy == true, search only in the beginning and in the ending of file ! 
    }
    if (typeof opts === 'string') {
        opts = {
            file: opts,
            type: 'uri'
        };
    } else 
    /******************************************************************************************************
               Can't be good for workers : they don't know anything about window !!
    if (typeof window !== 'undefined' && window.File && opts instanceof window.File)
    ********************************************************************************************************/
            {
        opts = {
            file: opts,
            type: 'file'
        };
        info.filesize = opts.file.size;
        info.filename = opts.file.name;
        info.filedate = opts.file.lastModifiedDate;
        info.speedy = speedy;
        info.mpgVers = 0;
        info.Atracks=[];            // Audio Streams
        info.Vtracks=[];            // Video Streams
        info.Stracks=[];            // Subtitles Streams
        info.PackHeaders=0;
        info.SystemHeaders=0;
        info.ENDPackets=0;
        info.PSMPackets=0;
        info.OthersPackets=0;
        info.PackHeadersSize=0;
        info.SystemHeadersSize=0;
        info.PSMPacketsSize=0;
        info.SCRs=[];
        info.SCR_tmp=[];
        info.SCR_deb=[];
        info.SCR_end=[];
        info.isDVD=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        info.indDVD=0
        info.menu = false;          //  Menu (Navigation) for MPEG2 / VOB files ... 
        info.beginend = false;      //  for MPGInfo when speedy == true !
        info.nbloop = 5;            //  for MPGInfo when speedy == true !  could be adapted with BuffSize
        info.countloop = 0;    
    }
    for (var k in opts) {
        options[k] = opts[k];
    }

    if (!options.file) {
        return cb('No file was set');
    }

    /******************************************************************************************************
               Can't be good for workers : they don't know anything about window !!
    if (options.type === 'file') {
        if (typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
            return cb('Browser does not have support for the File API and/or ArrayBuffers');
        }
    } else if (options.type === 'local') {
        if (typeof require !== 'function') {
            return cb('Local paths may not be read within a browser');
        }
        var fs = require('fs');
    } else {} /* Buffer Utitlities */
    /******************************************************************************************************/

    var MPGTree = {};
    MPGTree.parse = function(handle, callback) {

        var MPGPicture = 0x00;
        var MPGUserData = 0xB2;
        var MPGSequenceHeader = 0xB3;
        var MPGSequenceError = 0xB4;
        var MPGSequenceExtension = 0xB5;
        var MPGSequenceEnd = 0xB7;
        var MPGGOP = 0xB8;
        var MPGProgramEnd = 0xB9;
        var MPGPackHeader = 0xBA;
        var MPGSystemHeader = 0xBB;
        var MPGProgramStreamMap = 0xBC; 
        var MPGPrivateStream1 = 0xBD;
        var MPGPaddingStream = 0xBE;
        var MPGPrivateStream2 = 0xBF;
        var MPGAudioStreamB = 0xC0;
        var MPGAudioStreamE = 0xDF;
        var MPEGVideoStreamB = 0xE0;
        var MPEGVideoStreamE = 0xEF;
        var MPEGECMStream = 0xF0;
        var MPEGEMMStream = 0xF1;
        var MPEGITUStream = 0xF2;
        var MPEGISOStream = 0xF3;
        var MPEGITUAStream = 0xF4;
        var MPEGITUBStream = 0xF5;
        var MPEGITUCStream = 0xF6;
        var MPEGITUDStream = 0xF7;
        var MPEGITUEStream = 0xF8;
        var MPEGIAncillaryStream = 0xF9;
        var MPEGProgramStreamDirectory = 0xFF;
        var MPGStartCode = '000001';
        var MPGAudBitRates = [['?','?','?'], [32,32,32], [64,48,40], [96,56,48], [128,64,56], [160,80,64], [192,96,80], [224,112,96], 
                              [256, 128, 112], [288,160,128], [320,192,160], [352,224,192], [384,256,224], [416,320,256], [448,384,320]];
        var MPGAudSampling = [44.1, 48, 32, 'reserved'];  
        var MPGModeAudio = ['stereo', 'joint_stereo', 'dual_channel', 'single_channel'];  
        var MPGVideoFrameRate = ['forbidden', 23.976, 24, 25, 29.97, 30, 50, 59.94, 60];  
        var AC3Synch = '0b77';
        var AC3Sampling = [48, 44.1, 32, 'reserved'];                               // 38 à 63
        var AC3Bitrate = [[32, 96, 69, 64], [32, 96, 70, 64], [40, 120, 87, 80], [40, 120, 88, 80], [48, 144, 104, 96], [48, 144, 105, 96], [56, 168, 121, 112], [56, 168, 122, 112],
                          [64, 192, 139, 128], [64, 192, 140, 128], [80, 240, 174, 160], [80, 240, 175, 160], [96, 288, 208, 192], [96, 288, 209, 192], [112, 336, 243, 224], [112, 336, 244, 224],
                          [128, 384, 278, 256], [128, 384, 279, 256], [160, 480, 348, 320], [160, 480, 349, 320], [192, 576, 417, 384], [192, 576, 418, 384], [224, 672, 487, 448], [224, 672, 488, 448],
                          [256, 768, 557, 512], [256, 768, 558, 512], [320, 960, 696, 640], [320, 960, 697, 640], [384, 1152, 835, 768], [384, 1152, 836, 768], [448, 1344, 975, 896],
                          [448, 1344, 976, 896], [512, 1536, 1114, 1024], [512, 1536, 1115, 1024], [576, 1728, 1253, 1152], [576, 1728, 1254, 1152], [640, 1920, 1393, 1280], [640, 1920, 1394, 1280],
                          ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], 
                          ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved'], ['reserved']]; 
        var AC3mode = [[2,'1+1'], [1, '1/0'], [2, '2/0'], [3, '3/0'],
                       [3, '2/1'], [4, '3/1'], [4, '2/2'], [5, '3/2']];
        var AC3Service = ['complete main (CM)', 'music and effects (ME)', 'visually impaired (VI)', 'hearing impaired (HI)',
                          'dialog (D)', 'commentary (C)', 'emergency (E)', 'voice over (VO)', 'karaoke'];
        var DTSSynch = '7ffe8001';   
        var DTSSampling = ['invalid', 8, 16, 32, 'invalid', 'invalid', 11.025, 22.050, 44.100, 'invalid', 'invalid', 12, 24, 48, 'invalid', 'invalid']; 
        var DTSChannels = [1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 6, 7, 8, 8];             


        var BuffSize=16*16*1024;                   // could be adapted : size of standard buffer used in this module : must be greater than 2 BuffSecure !
        var BuffLength;
        var buffpos;
        var Filepos = 0;
        var BuffSecure = 8192;                     // precaution : if too small we could cross the limit of the buffer !

        function litHex(buffer, pos, nb){
            var id = [];
            for (var i = pos; i < pos+nb; i++) {
                var tmp=buffer.getUint8(i).toString(16);
                if (tmp.length == 1) tmp='0'+tmp;
                id.push(tmp);
            }
            return id.join("");
        }

        function litCar(buffer, pos, nb){
            var id = [];
            for (var i = pos; i < pos+nb; i++) {
                id.push(String.fromCharCode(buffer.getUint8(i)));
            }
            return id.join("");
        }


        function readBytes(nbB, offset, cb) {
            handle.read(nbB , offset , function retrB(err, buffer) {
                if (err){
                    cb(err);
                } else {
                    var dv = new DataView(buffer);
                    cb(null,dv);
                }
            });
        }

        function MPG12pack(buffer, buffpos){
            if ((litHex(buffer, buffpos,3) == MPGStartCode) && (buffer.getUint8(buffpos+3) == MPGProgramEnd)){          // 0x000001B9
                info.ENDPackets += 1;
                info.SCRs.push([SCR0, SCR1, SCR2, SCR3]);
                return buffpos+4;
            } else {
                if ((info.speedy) && (Filepos > 0)){
                    while ((litHex(buffer, buffpos,3) != MPGStartCode) || (buffer.getUint8(buffpos+3) != MPGPackHeader) && (buffpos < buffer.byteLength-4)){
                        buffpos+=1;
                    }                        
                }
                if ((litHex(buffer, buffpos,3) == MPGStartCode) && (buffer.getUint8(buffpos+3) == MPGPackHeader)){      // 0x000001BA  
                    if (info.indDVD < 16){
                        info.indDVD += 1;   
                        if ((buffpos % 0x800) == 0){
                            info.isDVD[info.indDVD] =1; 
                        }
                    }
                    buffpos+=4;
                    if ((((buffer.getUint8(buffpos) & 0x20) != 0x20) && (info.mpgVers == 1)) || (((buffer.getUint8(buffpos) & 0x40) != 0x40) && (info.mpgVers == 2))){
                        return 0;
                    } else {
                        if (info.mpgVers == 1){
                            var SCR0 = buffer.getUint8(buffpos) & 0xE;
                            buffpos+=1;
                            var SCR1 = buffer.getUint16(buffpos, false) >> 1;
                            var SCR2 = buffer.getUint16(buffpos+2, false) >> 1;
                            var SCR3=0;
                            buffpos+=4;
                        } else {
                            var SCR0 = (buffer.getUint8(buffpos) & 0x38) >> 3;
                            var SCR1 = (buffer.getUint8(buffpos) & 0x03) << 13;
                            buffpos+=1;
                            SCR1 += (buffer.getUint16(buffpos, false) & 0xFFF8) >> 3;
                            var SCR2 = (buffer.getUint16(buffpos) & 0x03) << 13;
                            SCR2 += (buffer.getUint16(buffpos+2, false) & 0xFFF8) >> 3;
                            var SCR3 = (buffer.getUint16(buffpos+2, false) & 0x03) << 7;
                            SCR3 += (buffer.getUint8(buffpos+5) & 0xFE) >> 1;
                            buffpos+=6;
                        }
                        if (info.SCR_deb.length == 0) {
                            info.SCR_deb = [SCR0, SCR1, SCR2, SCR3];
                        } else {
                            if (!info.speedy){
                                if (((SCR1 * 32768) + SCR2 ) < ((info.SCR_end[1] * 32768) + info.SCR_end[2])){
                                    info.SCRs.push(info.SCR_end);
                                }
                            }
                            info.SCR_end = [SCR0, SCR1, SCR2, SCR3];
                        } 
                        var BitRate = (buffer.getUint8(buffpos) & 0x7F) << 15;
                        BitRate += (buffer.getUint16(buffpos+1, false) & 0xFFFC) >> 2;
                        buffpos+=3;

                        info.PackHeaders += 1;
                        info.PackHeadersSize += 7;
                        if (info.mpgVers == 2) info.PackHeadersSize +=1;

                        if (litHex(buffer, buffpos,3) != MPGStartCode) {
                            return -1;
                        } else {
                            if (buffer.getUint8(buffpos+3) == MPGSystemHeader){     // System Header 000001BB
                                buffpos += 4;
                                var headerLength = buffer.getUint16(buffpos, false); 
                                info.SystemHeaders += 1;
                                info.SystemHeadersSize += headerLength+6;           // 4 (000001BB) + 2 (headerLength)
                                buffpos += 5;                                       // skip calcul of RateBound (3 bytes)
                                var tmp = buffer.getUint8(buffpos);
                                var AudioBound = (tmp & 0xFC) >> 2;
                                var fixedBitRate = (tmp & 0x20) >> 1;
                                var CSPS_flag = tmp & 1;
                                buffpos += 1;
                                tmp = buffer.getUint8(buffpos);
                                var System_audio_lock_flag = (tmp & 0x80) >> 7;
                                var System_video_lock_flag = (tmp & 0x40) >> 6;
                                var VideoBound = tmp & 0x1F;
                                buffpos += 2;                                       // skip reserved Byte (= 0xFF);
                                while ((buffer.getUint8(buffpos) & 0x80) == 0x80){
                                    buffpos += 3;                                   //  skip interpretation !! StreamID - "11" - STD_Buffer_scale & STD_Buffer_size
                                }
                                if (litHex(buffer, buffpos,3) != MPGStartCode) {
                                    return -2;
                                } else {
                                    buffpos += 0;                                   // points to StreamId
                                }
                            }
                            //               packet();
                            var StreamId = buffer.getUint8(buffpos+3);
                            buffpos += 4;
                            var StreamLength = buffer.getUint16(buffpos, false); 
                            var nextpos = buffpos + 2 + StreamLength;

                            if (StreamId == MPGProgramStreamMap){                  // for statistics
                                info.PSMPackets += 1;
                                info.PSMPacketsSize += StreamLength;    
                            }
                            // Video or Audio Stream ??
                            if ((StreamId >= MPGAudioStreamB) & (StreamId <= MPGAudioStreamE)){
                                // stream Audio !!
                                var indAud = StreamId - 0xC0;
                                if (typeof info.Atracks[indAud] == 'undefined'){
                                    info.Atracks[indAud] = {id : indAud, layer : 0, size : StreamLength, bitrate : 0, sampling : 0, packCount : 1, SCR_deb : [], SCR_end : []};
                                    var pos = buffpos + 2; 
                                    while (((buffer.getUint16(pos, false) & 0xFFF0) != 0xFFF0) || ((buffer.getUint16(pos, false) & 0x000F) == 0x000F)){
                                        pos +=1;
                                    }
                                    var AudSys1 = buffer.getUint16(pos, false) & 0xF;
                                    var AudSys2 = buffer.getUint16(pos+2, false) >> 4;
                                    var MPGAudio = (AudSys1 & 0x8) >> 3;
                                    var layer = 4 - ((AudSys1 & 0x6) >>1);
                                    info.Atracks[indAud].layer = layer;
                                    var tab = (AudSys2 & 0xF00) >> 8;
                                    info.Atracks[indAud].bitrate = MPGAudBitRates[tab][layer - 1];
                                    tab = (AudSys2 & 0x0C0) >>6;
                                    info.Atracks[indAud].sampling = MPGAudSampling[tab];
                                    tab = (AudSys2 & 0x00C) >>2;
                                    info.Atracks[indAud].channels = MPGModeAudio[tab];
                                    info.Atracks[indAud].SCR_deb = [SCR0, SCR1, SCR2, SCR3];
                                } else {
                                    info.Atracks[indAud].size += StreamLength;
                                    info.Atracks[indAud].packCount += 1;
                                    info.Atracks[indAud].SCR_end = [SCR0, SCR1, SCR2, SCR3];
                                }
                                pos += 4; 
                                while (((litHex(buffer, pos,3) != MPGStartCode) || (buffer.getUint8(pos+3) != MPGUserData)) && (pos<nextpos)){
                                    pos +=1;
                                }
                                    if ((litHex(buffer, pos,3) == MPGStartCode) && (buffer.getUint8(pos+3) == MPGUserData)){
                                        pos +=7;
                                        var datalength = buffer.getUint16(pos, false);
                                        info.Atracks[indAud].Audinfo = litCar(buffer, pos+2, datalength);
                                    }
                            } else {
                                if ((StreamId >= MPEGVideoStreamB) && (StreamId <= MPEGVideoStreamE)){ 
                                    // stream Video !!
                                    var indVid = StreamId - 0xE0;
                                    var pos = buffpos + 2; 

                                    // recherche extension :
                                    var posext = buffpos + 2; 
                                    while ((litHex(buffer, posext,3) != MPGStartCode) || (buffer.getUint8(posext+3) != MPGSequenceExtension) && (posext < nextpos-4)){
                                       posext += 1; 
                                    }
                                    if (posext < nextpos-4){
                                        var ExtId = (buffer.getUint8(posext+4) & 0xF0) >> 4;
                                        if (ExtId == 8){
                                            var ProfileLevel = (buffer.getUint16(posext+4,false) & 0x0FF0) >> 4;
                                            var Progressive = (buffer.getUint8(posext+5) & 0x08) >> 3;
                                            var Chroma = (buffer.getUint8(posext+5) & 0x0006) >> 1;
                                            var HorizSizeExt = (buffer.getUint16(posext+5,false) & 0x0180) >> 7;
                                            var VertSizeExt = (buffer.getUint8(posext+6) & 0x60) >> 5;
                                            var BitRateExt = (buffer.getUint16(posext+6, false) & 0x1FFE) >> 1;
                                        }
                                    }
                                    if (typeof info.Vtracks[indVid] == 'undefined'){
                                        while ((litHex(buffer, pos,3) != MPGStartCode) || (buffer.getUint8(pos+3) != MPGSequenceHeader) && (pos < nextpos)) {
                                            pos += 1;
                                        }
                                        if (pos < nextpos){
                                            pos += 4;
                                            var tmp = buffer.getUint32(pos, false);       // OK always > 0
                                            var width = (tmp & 0xFFF00000) >> 20;
                                            var height = (tmp & 0x000FFF00) >> 8;
                                            var PAR = (tmp & 0x000000F0) >> 4;
                                            var PictureRate = tmp & 0x0000000F;
                                            var framerate = MPGVideoFrameRate[PictureRate];
                                            var BitRate = Math.floor (buffer.getUint32(pos+4, false) / (1 << 14));  // because (buffer.getUint32(pos+4, false) & 0xFFFFC000) >> 14 could be < 0
                                            if (BitRate == 0x3FFFF) {
                                                BitRate="Variable";
                                            } else {
                                                BitRate *= 400;
                                            }
                                            info.Vtracks[indVid] = {id : indVid, width : width, height : height, framerate : framerate, BitRate : BitRate, size : StreamLength, packCount : 1, SCR_deb : [], SCR_end : []};
                                            info.Vtracks[indVid].SCR_deb = [SCR0, SCR1, SCR2, SCR3];
                                        } else {
                                            pos = buffpos + 2;              // ??? or -5 ??
                                        }
                                    } else {
                                        info.Vtracks[indVid].size += StreamLength ;
                                        info.Vtracks[indVid].packCount += 1 ;
                                        info.Vtracks[indVid].SCR_end = [SCR0, SCR1, SCR2, SCR3];
                                    }
                                    if ((info.Vtracks[indVid]) && (typeof info.Vtracks[indVid].Vidinfo == 'undefined')){          // One egg enough !! (pity joke half english half french : "un oeuf" <=> "one egg")
                                        pos += 7; 
                                        while (((litHex(buffer, pos,3) != MPGStartCode) || (buffer.getUint8(pos+3) != MPGUserData)) && (pos < nextpos)){
                                            pos +=1;
                                        }
                                        if ((litHex(buffer, pos,3) == MPGStartCode) && (buffer.getUint8(pos+3) == MPGUserData)){
                                            var nextStartCodeoff = pos+6; // supposed that string is coded like 'length' + string
                                            while ((litHex(buffer, nextStartCodeoff,3) != MPGStartCode) && (nextStartCodeoff < nextpos)) nextStartCodeoff +=1;
                                            if (nextStartCodeoff < nextpos){
                                                for (var i=nextStartCodeoff -2; i>pos+4; i--){
                                                    if ((buffer.getUint16(i, false) + i + 3 == nextStartCodeoff) && (buffer.getUint8(nextStartCodeoff-1) == 0)){
                                                        var datalength = buffer.getUint16(i, false);
                                                        info.Vtracks[indVid].Vidinfo = litCar(buffer, i+2, datalength);
                                                        break;
                                                    }
                                                }
                                                if (typeof info.Vtracks[indVid].Vidinfo == 'undefined'){
                                                    info.Vtracks[indVid].Vidinfo='';
                                                }    
                                            }
                                        }
                                    }
                                }    
                            }    
                            if ((StreamId == MPGPrivateStream1) && (info.mpgVers == 2)){ // MPEG-2 Private1 : audio non MPEG et Subtitles ! There is an extension
                                // this is valid for specific DVD files like .VOB
                                // buffpos points to length ! so
                                buffpos += 2;
                                var HeaderLength = buffer.getUint8(buffpos+2);
                                /*
                                var PTSFlag = (buffer.getUint8(buffpos+1) & 0x80) >> 7; 
                                if (PTSFlag == 1){
                                    var PTS0 = (buffer.getUint8(buffpos+3) & 0xE) >> 1;
                                    var PTS1 = (buffer.getUint16(buffpos+4,false) & 0xFFFE) >> 1;
                                    var PTS2 = (buffer.getUint16(buffpos+6,false) & 0xFFFE) >> 1; 
                                }
                                */                   // Don't bother
                                buffpos += 3 + HeaderLength;
                                var SubStreamId = buffer.getUint8(buffpos);
                                                                
                                if ((SubStreamId > 31) && (SubStreamId < 64)){                                       // Subtitles = 0x20 -- 0x3F
                                    var indSub = SubStreamId - 32;  
                                    if (typeof info.Stracks[indSub] == 'undefined'){
                                        info.Stracks[indSub] = {id : indSub, bettersize : buffer.getUint16(buffpos+1,false), packCount : 1, SCR_deb : [SCR0, SCR1, SCR2, SCR3], SCR_end : []};   
                                    } else {
                                            info.Stracks[indSub].packCount += 1 ;
                                            info.Stracks[indSub].bettersize += buffer.getUint16(buffpos+1,false) ;
                                            info.Stracks[indSub].SCR_end = [SCR0, SCR1, SCR2, SCR3];   
                                    }                                        
                                } else {
                                    if ((SubStreamId > 127) && (SubStreamId < 136)){                                 // AC3 header = 0x80  : http://stnsoft.com/DVD/ac3hdr.html
                                        var indAud = SubStreamId - 128;
                                        if (typeof info.Atracks[indAud] == 'undefined'){
                                            var synchpos=buffpos;
                                            while ((litHex(buffer, synchpos,2) != AC3Synch) && (synchpos < nextpos)){ 
                                                synchpos += 1;
                                            }
                                            if (synchpos < nextpos){
                                                info.Atracks[indAud] = {id : indAud, layer : 'AC3', size : StreamLength, bitrate : 0, sampling : 0, packCount : 1, SCR_deb : [SCR0, SCR1, SCR2, SCR3], SCR_end : []};
                                                synchpos += 4;                // AC3-Synch + AC3-CRC1
                                                var fscod = (buffer.getUint8(synchpos) & 0xC0) >> 6;
                                                info.Atracks[indAud].sampling = AC3Sampling[fscod];
                                                var frmsizcod = buffer.getUint8(synchpos) & 0x3F;
                                                info.Atracks[indAud].bitrate = AC3Bitrate[frmsizcod][0];
                                                var bsmod = buffer.getUint8(synchpos+1) & 7;
                                                var acmod = (buffer.getUint8(synchpos+2) & 0xE0) >> 5;
                                                info.Atracks[indAud].AC3Mode = AC3mode[acmod];
                                                if ((bsmod == 7)  && (acmod > 1)) bsmod = 8;
                                                info.Atracks[indAud].bsMode = AC3Service[bsmod];
                                            }         
                                        } else {
                                            info.Atracks[indAud].size += StreamLength ;
                                            info.Atracks[indAud].packCount += 1 ;
                                            info.Atracks[indAud].SCR_end = [SCR0, SCR1, SCR2, SCR3];                                            
                                        }    
                                    } else {
                                        if ((SubStreamId > 159) && (SubStreamId < 168)){                             // LCPM audio = 0xA0 -- 0xA8  http://stnsoft.com/DVD/ass-hdr.html
                                            var indAud = SubStreamId - 160;      
                                            if (typeof info.Atracks[indAud] == 'undefined'){
                                                var quantization = 16 + ((buffer.getUint8(buffpos+4) & 0xC0) >> 4);  // 16 + (4*quant) - with 0x11 is invalid [16, 20, 24, 'invalid']
                                                var sampling = 48 * 1024;
                                                if ((buffer.getUint8(buffpos+4) & 0x30) == 0x10)  sampling *= 2;     // (96 kbps)
                                                var nbChannels = (buffer.getUint8(buffpos+4) & 0x0F) + 1;
                                                var size = quantization * sampling * nbChannels / 4800;
                                                var bitrate = 600 * size / 1024 ;                                    // 600 fps bitrate in Kbps
                                                info.Atracks[indAud] = {id : indAud, layer : 'LCPM', bettersize : size, size : size, bitrate : bitrate, sampling : sampling, packCount : 1, nbChannels : nbChannels, SCR_deb : [SCR0, SCR1, SCR2, SCR3], SCR_end : []};
                                            } else {
                                                info.Atracks[indAud].bettersize += info.Atracks[indAud].size ;
                                                info.Atracks[indAud].packCount += 1 ;
                                                info.Atracks[indAud].SCR_end = [SCR0, SCR1, SCR2, SCR3];                                          
                                            }
    
                                        } else {
                                            if ((SubStreamId > 135) && (SubStreamId < 144)){                         // DTS header = 0x88 : Confirmed !   http://stnsoft.com/DVD/dtshdr.html
                                                                              
                                                var indAud = SubStreamId - 136;                              
                                                if (typeof info.Atracks[indAud] == 'undefined'){
                                                    var synchpos=buffpos;
                                                    while ((litHex(buffer, synchpos,4) != DTSSynch) && (synchpos < nextpos)){ 
                                                        synchpos += 1;
                                                    }
                                                    if (synchpos < nextpos){
                                                        var amode = (buffer.getUint16(synchpos+7, false) & 0x0FC0) >> 6;
                                                        var sfreq = (buffer.getUint8(synchpos+8) & 0x3C) >> 2;
                                                        var rate = (buffer.getUint16(synchpos+8, false) & 0x03C0) >> 6;
                                                        info.Atracks[indAud] = {id : indAud, layer : 'DTS', size : StreamLength, bettersize : 0, bitrate : 754.5, sampling : 'invalid', packCount : 1, SCR_deb : [SCR0, SCR1, SCR2, SCR3], SCR_end : []};
                                                        if (rate == 15) {
                                                            info.Atracks[indAud].bitrate = 754.5;            // Kbps
                                                            info.Atracks[indAud].bettersize += 1005;    
                                                        } else {
                                                            info.Atracks[indAud].bitrate = 1536;             // Kbps  
                                                            info.Atracks[indAud].bettersize += 2012;   
                                                        }
                                                        info.Atracks[indAud].nbChannels = DTSChannels[amode];
                                                        if (DTSSampling[sfreq] != 'invalid'){
                                                            info.Atracks[indAud].sampling = DTSSampling[sfreq];
                                                        }    
                                                    }         
                                                } else {
                                                    info.Atracks[indAud].size += StreamLength ;
                                                    info.Atracks[indAud].packCount += 1 ;
                                                    info.Atracks[indAud].SCR_end = [SCR0, SCR1, SCR2, SCR3];
                                                    if (info.Atracks[indAud].bitrate == 772608){
                                                        info.Atracks[indAud].bettersize += 1005;  
                                                    }  else {
                                                        info.Atracks[indAud].bettersize += 2012;
                                                    }                                           
                                                }    
                                            }  else {
                                                if ((SubStreamId > 143) && (SubStreamId < 152)){                     // 0x90-0x97 : SDDS (audio)
                                                    var indAud = SubStreamId - 144; 
                                                }  else {
                                                    if ((SubStreamId > 143) && (SubStreamId < 152)){                 //  0xC0-0xCF : AC3 et E-AC3 in EVOB files !
                                                    }    
                                                }  
                                            }                                 

                                        }   
                                    }
                                }
                            }
                            if (StreamId != MPGPrivateStream2){               //  MPEG-2   : navigation / menu (0xBF)
                                info.OthersPackets += 1;
                                buffpos += 2;
                                while ((buffer.getUint8(buffpos) & 0x80) == 0x80){
                                    buffpos += 1;                            
                                }
                                if ((buffer.getUint8(buffpos) & 0xC0) == 0x40){           // begin with '01' : 2 bytes !
                                    buffpos += 2;                             // STD_Buffer_scale & STD_Buffer_size
                                }   
                                if ((buffer.getUint8(buffpos) & 0xF0) == 0x20){
                                    buffpos += 5;                             // PTS
                                } else {
                                    if ((buffer.getUint8(buffpos) & 0xF0) == 0x30){    
                                        buffpos += 10;                        // PTS & DTS
                                    } else {
                                        buffpos += 1;                         // 0x0F !
                                    }    
                                }  
                            } else {
                                if (info.mpgVers == 2){
                                    // MPEG2 et Stream = MPGPrivateStream2
                                    info.menu = true;
                                }    
                            }
                            if (buffer.getUint8(nextpos+3) == MPGProgramEnd){           // precaution
                                info.ENDPackets += 1;
                                info.SCRs.push([SCR0, SCR1, SCR2, SCR3]);
                                return -3;
                            } else {
                                while ((litHex(buffer, nextpos,3) != MPGStartCode) || (buffer.getUint8(nextpos+3) != MPGPackHeader) && (nextpos < buffer.byteLength-4)){
                                    nextpos+=1;
                                }    
                                if (nextpos == buffer.ByteLength-4){
                                    return -2;
                                } else {
                                    return nextpos;
                                }    
                            }    
                        }
                    }   
                } else {
                    if (buffer.getUint8(buffpos+3) == MPGPaddingStream) {
                        info.OthersPackets += 1;
                        var StreamLength = buffer.getUint16(buffpos+4, false);
                        var nextpos = buffpos + 6 + StreamLength;
                        while ((litHex(buffer, nextpos,3) != MPGStartCode) || (buffer.getUint8(nextpos+3) != MPGPackHeader) && (nextpos < buffer.byteLength-4)){
                            nextpos+=1;
                        }    
                        if (nextpos == buffer.ByteLength-4){
                            return -2;
                        } else {
                            return nextpos;
                        }    
                    }  
                }   
            }    
        }

        function LoadBuffer(BuffOffset, suite){
            var offset = BuffOffset;
            var nbB = BuffSize;
            if (info.filesize - offset < BuffSize){
                nbB =info.filesize - offset;
            }
            readBytes(nbB, offset, function(err, buffer){
                if (err){
                    return suite(err);
                } else {
                    // traite Buffer
                    BuffLength = buffer.byteLength;
                    Filepos = BuffOffset + BuffLength;
                    buffpos = 0;
                    if ((info.speedy) && (info.beginend)){
                        while ((litHex(buffer, buffpos,3) != MPGStartCode) || (buffer.getUint8(buffpos+3) != MPGPackHeader) && (buffpos < buffer.byteLength-4)){
                            buffpos+=1;
                        }                        
                    }
                    if (litHex(buffer,buffpos,4) == '000001ba'){
                        if ((buffer.getUint8(buffpos+4) & 0xF0) == 0x20){
                            info.mpgVers = 1;    
                        } else {
                            if ((buffer.getUint8(buffpos+4) & 0xC0) == 0x40){
                                info.mpgVers = 2;
                            } else {
                                return suite('This file is not an MPG file but begin with 000001BA');    
                            }        
                        }
                    } else {
                        return suite('This file is not an MPG file');
                    }
                    if (info.mpgVers == 1 || info.mpgVers == 2){
                        var nextBuffOffset = 0;
                        do {
                            var oldOffset = nextBuffOffset;
                            var nextBuffOffset = MPG12pack(buffer, nextBuffOffset);
                        } while (((nextBuffOffset > 0) && (nextBuffOffset <= BuffLength-BuffSecure) && (Filepos != info.filesize)) || ((Filepos == info.filesize) && (nextBuffOffset == -3)) || (nextBuffOffset<0));
                    }
                    if (info.speedy) info.countloop++;

                    if (nextBuffOffset == -3){
                        suite(null,info);    
                    } else {
                        if (nextBuffOffset < 0){
                            return suite('error : '+nextBuffOffset);
                        } else {
                            buffpos=nextBuffOffset;
                            BuffOffset=Filepos - BuffLength + buffpos;   
                            if (Filepos >= info.filesize){                      // End of File
                                //       for .vob files, it's possible that all streams not here - for example : stream subtitle n°2 here but neither n°0 neither n°1
                                //       Clean streams which are "null" ! 
                                var tabpos=[];
                                for (var i=info.Stracks.length-1; i>-1; i--){
                                    if (info.Stracks[i] != null){
                                        tabpos.push(info.Stracks[i]);
                                    }
                                } 
                                info.Stracks = tabpos;
                                tabpos=[];
                                for (var i=info.Vtracks.length-1; i>-1; i--){
                                    if (info.Vtracks[i] != null){
                                        tabpos.push(info.Vtracks[i]);
                                    }
                                } 
                                info.Vtracks = tabpos;
                                tabpos=[];
                                for (var i=info.Atracks.length-1; i>-1; i--){
                                    if (info.Atracks[i] != null){
                                        tabpos.push(info.Atracks[i]);
                                    }
                                } 
                                info.Atracks = tabpos;

                                if (info.SCRs.length == 0){
                                    info.dureeS = (((info.SCR_end[1] * 32768) + info.SCR_end[2]) - ((info.SCR_deb[1] * 32768) + info.SCR_deb[2])) / 90000;
                                } else {
                                    info.dureeS = (((info.SCRs[0][1] * 32768) + info.SCRs[0][2]) - ((info.SCR_deb[1] * 32768) + info.SCR_deb[2])) / 90000;
                                    for (var i = 1; i < info.SCRs.length-1; i++){
                                        info.dureeS += ((info.SCRs[i][1] * 32768) + info.SCRs[i][2]) / 90000;   
                                    }
                                    info.dureeS += ((info.SCR_end[1] * 32768) + info.SCR_end[2]) / 90000;
                                }
                                info.dureeS = Math.round(1000 * info.dureeS) / 1000;

                                for (var i=0; i<info.Vtracks.length; i++){
                                    if (info.SCRs.length == 0){
                                        info.Vtracks[i].dureeS = (((info.Vtracks[i].SCR_end[1] * 32768) + info.Vtracks[i].SCR_end[2]) - ((info.Vtracks[i].SCR_deb[1] * 32768) + info.Vtracks[i].SCR_deb[2])) / 90000;
                                    } else {
                                        info.Vtracks[i].dureeS = (((info.SCRs[0][1] * 32768) + info.SCRs[0][2]) - ((info.Vtracks[i].SCR_deb[1] * 32768) + info.Vtracks[i].SCR_deb[2])) / 90000;
                                        for (var j = 1; j < info.SCRs.length-1; j++){
                                            info.Vtracks[i].dureeS += ((info.SCRs[j][1] * 32768) + info.SCRs[j][2]) / 90000;   
                                        }
                                        info.Vtracks[i].dureeS += ((info.Vtracks[i].SCR_end[1] * 32768) + info.Vtracks[i].SCR_end[2]) / 90000;
                                    }
                                    info.Vtracks[i].dureeS = Math.round(1000 * info.Vtracks[i].dureeS) / 1000;
                                    if (info.Vtracks[i].dureeS < (info.dureeS * 0.95)){
                                        info.Vtracks[i].dureeS = info.dureeS;
                                    }    
                                }
                                for (var i=0; i<info.Atracks.length; i++){
                                    if (info.SCRs.length == 0){
                                        info.Atracks[i].dureeS = (((info.Atracks[i].SCR_end[1] * 32768) + info.Atracks[i].SCR_end[2]) - ((info.Atracks[i].SCR_deb[1] * 32768) + info.Atracks[i].SCR_deb[2])) / 90000;
                                    } else {
                                        info.Atracks[i].dureeS = (((info.SCRs[0][1] * 32768) + info.SCRs[0][2]) - ((info.Atracks[i].SCR_deb[1] * 32768) + info.Atracks[i].SCR_deb[2])) / 90000;
                                        for (var j = 1; j < info.SCRs.length-1; j++){
                                            info.Atracks[i].dureeS += ((info.SCRs[j][1] * 32768) + info.SCRs[j][2]) / 90000;   
                                        }
                                        info.Atracks[i].dureeS += ((info.Atracks[i].SCR_end[1] * 32768) + info.Atracks[i].SCR_end[2]) / 90000;
                                    }
                                    info.Atracks[i].dureeS = Math.round(1000 * info.Atracks[i].dureeS) / 1000;
                                }
                                for (var i=0; i<info.Stracks.length; i++){
                                    if (info.SCRs.length == 0){
                                        info.Stracks[i].dureeS = (((info.Stracks[i].SCR_end[1] * 32768) + info.Stracks[i].SCR_end[2]) - ((info.Stracks[i].SCR_deb[1] * 32768) + info.Stracks[i].SCR_deb[2])) / 90000;
                                    } else {
                                        info.Stracks[i].dureeS = (((info.SCRs[0][1] * 32768) + info.SCRs[0][2]) - ((info.Stracks[i].SCR_deb[1] * 32768) + info.Stracks[i].SCR_deb[2])) / 90000;
                                        for (var j = 1; j < info.SCRs.length-1; j++){
                                            info.Stracks[i].dureeS += ((info.SCRs[j][1] * 32768) + info.SCRs[j][2]) / 90000;   
                                        }
                                        info.Stracks[i].dureeS += ((info.Stracks[i].SCR_end[1] * 32768) + info.Stracks[i].SCR_end[2]) / 90000;
                                    }
                                    info.Stracks[i].dureeS = Math.round(1000 * info.Stracks[i].dureeS) / 1000;
                                    info.Stracks[i].bitrate = (info.Stracks[i].bettersize * 8 / info.Stracks[i].dureeS) / 1024;   // kbps
                                }
                                suite(null,info);
                            } else {
                                if (info.speedy && (info.Vtracks.length > 0) && (!info.beginend) && (info.countloop == info.nbloop)){
                                    BuffOffset = info.filesize - (10*BuffSize); 
                                    info.beginend = true;   
                                }
                                LoadBuffer(BuffOffset,suite);
                            }                            
                        }
                    }

                }
            });

        }
            if (info.filesize < info.nbloop * 2 * BuffSize){  // less then 2*BuffSize so :
                info.speedy = false;
            }

            LoadBuffer(0, function(err){
                if (err){
                    callback(err);
                } else {
                    callback(null, info);
                }
            });
        }    

        /*
         * Reader.js
         * A unified reader interface for AJAX, local and File API access
         * 43081j
         * License: MIT, see LICENSE
         */
    var Reader = function(type) {
        this.type = type || Reader.OPEN_URI;
        this.size = null;
        this.file = null;
    };

    Reader.OPEN_FILE = 1;
    Reader.OPEN_URI = 2;
    Reader.OPEN_LOCAL = 3;

    if (typeof require === 'function') {
        var fs = require('fs');
    }

    Reader.prototype.open = function(file, callback) {
        this.file = file;
        var self = this;
        switch (this.type) {
            case Reader.OPEN_LOCAL:
                fs.stat(this.file, function(err, stat) {
                    if (err) {
                        return callback(err);
                    }
                    self.size = stat.size;
                    fs.open(self.file, 'r', function(err, fd) {
                        if (err) {
                            return callback(err);
                        }
                        self.fd = fd;
                        callback();
                    });
                });
                break;
            case Reader.OPEN_FILE:
                this.size = this.file.size;
                callback();
                break;
            default:
                this.ajax({
                        uri: this.file,
                        type: 'HEAD',
                    },
                    function(err, resp, xhr) {
                        if (err) {
                            return callback(err);
                        }
                        self.size = parseInt(xhr.getResponseHeader('Content-Length'));
                        callback();
                    }
                );
                break;
        }
    };

    Reader.prototype.close = function() {
        if (this.type === Reader.OPEN_LOCAL) {
            fs.close(this.fd);
        }
    };

    Reader.prototype.read = function(length, position, callback) {
        if (typeof position === 'function') {
            callback = position;
            position = 0;
        }
        if (this.type === Reader.OPEN_LOCAL) {
            this.readLocal(length, position, callback);
        } else if (this.type === Reader.OPEN_FILE) {
            this.readFile(length, position, callback);
        } else {
            this.readUri(length, position, callback);
        }
    };

    Reader.prototype.readBlob = function(length, position, type, callback) {
        if (typeof position === 'function') {
            callback = position;
            position = 0;
        } else if (typeof type === 'function') {
            callback = type;
            type = 'application/octet-stream';
        }
        this.read(length, position, function(err, data) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, new Blob([data], {
                type: type
            }));
        });
    };

    /*
     * Local reader
     */
    Reader.prototype.readLocal = function(length, position, callback) {
        var buffer = new Buffer(length);
        fs.read(this.fd, buffer, 0, length, position, function(err, bytesRead, buffer) {
            if (err) {
                return callback(err);
            }
            var ab = new ArrayBuffer(buffer.length),
                view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; i++) {
                view[i] = buffer[i];
            }
            callback(null, ab);
        });
    };

    /*
     * URL reader
     */
    Reader.prototype.ajax = function(opts, callback) {
        var options = {
            type: 'GET',
            uri: null,
            responseType: 'text'
        };
        if (typeof opts === 'string') {
            opts = {
                uri: opts
            };
        }
        for (var k in opts) {
            options[k] = opts[k];
        }
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            if (xhr.status !== 200 && xhr.status !== 206) {
                return callback('Received non-200/206 response (' + xhr.status + ')');
            }
            callback(null, xhr.response, xhr);
        };
        xhr.responseType = options.responseType;
        xhr.open(options.type, options.uri, true);
        if (options.range) {
            options.range = [].concat(options.range);
            if (options.range.length === 2) {
                xhr.setRequestHeader('Range', 'bytes=' + options.range[0] + '-' + options.range[1]);
            } else {
                xhr.setRequestHeader('Range', 'bytes=' + options.range[0]);
            }
        }
        xhr.send();
    };

    Reader.prototype.readUri = function(length, position, callback) {
        this.ajax({
                uri: this.file,
                type: 'GET',
                responseType: 'arraybuffer',
                range: [position, position + length - 1]
            },
            function(err, buffer) {
                if (err) {
                    return callback(err);
                }
                return callback(null, buffer);
            }
        );
    };

    /*
     * File API reader
     */
    Reader.prototype.readFile = function(length, position, callback) {
    /*      OK in wekWorkers (OK for Chrome, Opera and IE) except Firefox  :
    /*                       http://stackoverflow.com/questions/22741478/firefox-filereader-is-not-defined-only-when-called-from-web-worker     */    
        if (typeof FileReader === 'undefined'){
            var slice = this.file.slice(position, position + length),
                fr=new FileReaderSync();
            callback(null,fr.readAsArrayBuffer(slice));
        } else {    
            var slice = this.file.slice(position, position + length),
               fr = new FileReader();
            fr.onload = function(e) {
                callback(null, e.target.result);
            };
            fr.readAsArrayBuffer(slice);
        }
    };
    /*
     * Read the file
     */

    if (typeof options.type === 'string') {
        switch (options.type) {
            case 'file':
                options.type = Reader.OPEN_FILE;
                break;
            case 'local':
                options.type = Reader.OPEN_LOCAL;
                break;
            default:
                options.type = Reader.OPEN_URI
        }
    }

    var handle = new Reader(options.type);

    handle.open(options.file, function(err) {
        if (err) {
            return cb('Could not open specified file');
        }
        MPGTree.parse(handle, function(err, tags) {
            mpgcb(err, tags);
        });
    });
}; // MP4Tag.parse ! ??



if (typeof module !== 'undefined' && module.exports) {
    module.exports = mpg;
} else {
    if (typeof define === 'function' && define.amd) {
        define('mpg', [], function() {
            return mpg;
        });
    } 
};
