"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// --------------------------------------------------------------------------
//
// CrossFadeBgm
//
// Copyright (c) 2016 hatonekoe
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
//
// 2016/09/12 ver0.1.2 コメントの追加や、ログ出力のコメントアウトなど
// 2016/09/11 ver0.1.1 無名BGMを再生するとクラッシュする不具合に対応、first release
// 2016/09/11 ver0.1.0 クロスフェード機能、ひとまずの完成
// 2016/09/10 ver0.0.1 開発開始
//
// --------------------------------------------------------------------------
/*:
 * @plugindesc BGMをクロスフェード
 * @author ハトネコエ - http://hato-neko.x0.com
 *
 * @help
 *
 * プラグインコマンド:
 *   CrossFadeBgm set bgm_name       # 次に流す曲を指定します
 *   CrossFadeBgm set bgm_name,60    # カンマで区切ると次に流す曲、音量などの指定が可能です。カンマのあとにスペースを入れてはいけません
 *   CrossFadeBgm start              # クロスフェードを開始します
 *   CrossFadeBgm setDuration 8.41   # フェード時間を定義します（この例では8.41秒）
 *   CrossFadeBgm resetDuration      # フェード時間をデフォルト値に戻します
 *
 * 【setコマンドの詳細】
 *   CrossFadeBgm set bgm_name,volume,pan,pitch  # setコマンドでは 4つのオプションが指定できます
 *
 *   <options>
 *   bgm_name: BGM名です。空白を含んではいけません。空白文字や日本語を含むファイル名を使うのは避けましょう
 *   volume: 音量です。0 ~ 100、ツクールの「BGMの演奏」のデフォルトだと 90
 *   pan: 音が左右のどちらに寄っているかです。-100 ~ 100、中心は 0 です
 *   pitch: 音の高さです。スピードも変わってしまうようです。50 ~ 200 程度にしましょう。デフォルトは 100
 *
 *   <example>
 *   CrossFadeBgm set Ship1,90,0,100 # 例えばこのように指定できます。カンマのあとにスペースを入れてはいけません
 *   CrossFadeBgm set Ship1,,,100    # 途中の値を省略することが可能です。しかし、BGM名と音量は最低限指定した方がいいです
 *                                   # 省略された音量などの値は、現在流れてるBGMの値が使われます
 *
 * 注意事項:
 *   ツクールでの「デプロイメント」でゲームを出力するとき、「未使用ファイルを含まない」のチェックをONにした場合、
 *   ツクールはプラグインコマンドでどのBGMが使われてるのかまでは見ませんので、
 *   本当は使っているのに、使ってないとみなされて必要なBGMファイルが出力されない場合があります。
 *
 *   これではそのBGMを再生しようとしたときにエラーが発生してしまいます。
 *
 *   対策としては、「未使用ファイルを含まない」のチェックをOFFでデプロイメントするか、
 *   ダミーの（ゲームでは実際通らない）マップを用意して、出力されないBGMを演奏するイベントをそこに置くといいかと思います。
 *
 * @param Default Fade Duration Sec
 * @desc デフォルトのフェード時間（秒）
 * @default 1.20
 *
 */

(function () {
  "use strict";

  var pluginName = "HTN_CrossFadeBgm";

  /**
   * bgm は Array クラス
   * buffer は WebAudio クラス、もしくは Html5Audio クラス
   */

  var BgmBuffer = function () {
    function BgmBuffer() {
      _classCallCheck(this, BgmBuffer);

      BgmBuffer.extendAudioManager();
      BgmBuffer.setIndexForCurrentBgm(0);
    }

    /**
     * ツクールの AudioManager クラスを拡張
     *
     * @FIXME 他のプラグインが playBgm() とか拡張するとこのプラグインが動かなくなる
     */


    _createClass(BgmBuffer, null, [{
      key: "extendAudioManager",
      value: function extendAudioManager() {
        AudioManager._bgmArray = [];
        AudioManager._bgmBufferArray = [];

        /** BGM の再生 */
        AudioManager.playBgm = function (bgm, pos) {
          if (AudioManager.isCurrentBgm(bgm)) {
            AudioManager.updateBgmParameters(bgm);
          } else {
            AudioManager.stopBgm();
            if (bgm.name !== null) {
              if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
                AudioManager.playEncryptedBgm(bgm, pos);
              } else {
                bgm.pos = pos;
                BgmBuffer.pushBuffer(bgm);
                // AudioManager._bgmBuffer = AudioManager.createBuffer('bgm', bgm.name);
                AudioManager.updateBgmParameters(bgm);
                if (!AudioManager._meBuffer) {
                  // AudioManager._bgmBuffer.play(true, pos || 0);
                  BgmBuffer.playAllBuffers();
                }
              }
            }
          }
          // AudioManager.updateCurrentBgm(bgm, pos);
        };

        /** playEncryptedBgm から呼ばれる。暗号化されたBGMを再生するためのバッファを作成 */
        AudioManager.createDecryptBuffer = function (url, bgm, pos) {
          AudioManager._blobUrl = url;
          bgm.pos = pos;
          BgmBuffer.pushBuffer(bgm);
          // AudioManager._bgmBuffer = AudioManager.createBuffer('bgm', bgm.name);
          AudioManager.updateBgmParameters(bgm);
          if (!AudioManager._meBuffer) {
            // AudioManager._bgmBuffer.play(true, pos || 0);
            BgmBuffer.playAllBuffers();
          }
          // AudioManager.updateCurrentBgm(bgm, pos);
        };

        /**
         * BGM の再生停止
         * バッファー配列は空にする
         */
        AudioManager.stopBgm = function () {
          AudioManager._bgmBufferArray.forEach(function (buffer) {
            if (buffer !== null) {
              buffer.stop();
              buffer = null;
            }
          });
          BgmBuffer.setIndexForCurrentBgm(0);
          AudioManager._bgmArray = [];
          AudioManager._bgmBufferArray = [];
        };
      }

      /**
       * _bgmBuffer は AudioManager._bgmBufferArray から読み取る
       * _currentBgm は AudioManager._bgmArray から読み取る
       * ここでは、その _bgmBuffer, _currentBgm の書き込み・読み込みの対象となる配列のindex(0~)を指定する
       *
       * @param _indexForCurrentBgm: Number _bgmBuffer, _currentBgm の対象となる配列のindex(0~)
       */

    }, {
      key: "setIndexForCurrentBgm",
      value: function setIndexForCurrentBgm(_indexForCurrentBgm) {
        var indexForCurrentBgm = parseInt(_indexForCurrentBgm);
        var length = BgmBuffer.countBuffers();

        if (indexForCurrentBgm === 0 || 0 <= indexForCurrentBgm && indexForCurrentBgm < length) {
          Object.defineProperty(AudioManager, '_bgmBuffer', {
            get: function get() {
              return AudioManager._bgmBufferArray[indexForCurrentBgm];
            },
            set: function set(_buffer) {
              AudioManager._bgmBufferArray[indexForCurrentBgm] = _buffer;
            },
            configurable: true
          });

          Object.defineProperty(AudioManager, '_currentBgm', {
            get: function get() {
              return AudioManager._bgmArray[indexForCurrentBgm];
            },
            set: function set(_bgm) {
              AudioManager._bgmArray[indexForCurrentBgm] = _bgm;
            },
            configurable: true
          });
        } else {
          console.warn("!!WARN!! index number is not valid @ setIndexForCurrentBgm");
        }
      }

      /**
       * バッファーを後ろに足す
       *
       * @param _newBgm: Array 例 {name: "bgm_title", volume: 90, pitch: 100, pan: 0, pos: 0}
       */

    }, {
      key: "pushBuffer",
      value: function pushBuffer(_newBgm) {
        // 未定義の部分は現在の曲の値をセットしてあげる
        var newBgm = BgmBuffer.arrangeNewBgm(_newBgm, AudioManager._currentBgm);

        AudioManager._bgmArray.push(newBgm);

        // 無名BGMも曲として扱うが、バッファーとしてはnull
        if (newBgm.name === "") {
          AudioManager._bgmBufferArray.push(null);
        } else if (newBgm.name !== null) {
          // 暗号化されたオーディオファイルの場合 @TODO 通らないっぽいので消してもいいかも
          if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
            var ext = AudioManager.audioFileExt();
            var url = AudioManager._path + 'bgm/' + encodeURIComponent(bgm.name) + ext;
            url = Decrypter.extToEncryptExt(url);
            Decrypter.decryptHTML5Audio(url, bgm, bgm.pos);
            AudioManager._blobUrl = url;
          }
          AudioManager._bgmBufferArray.push(AudioManager.createBuffer('bgm', newBgm.name));
        } else {
          console.warn("!!WARN!! next bgm name is null @ pushBuffer");
          AudioManager._bgmBufferArray.push(null); // _bgmArray の個数と整合性を保つため挿入
        }
      }

      /**
       * バッファーを先頭に足す
       *
       * @param _newBgm: Array 例 {name: "bgm_title", volume: 90, pitch: 100, pan: 0, pos: 0}
       */

    }, {
      key: "unshiftBuffer",
      value: function unshiftBuffer(_newBgm) {
        // 未定義の部分は現在の曲の値をセットしてあげる
        var newBgm = BgmBuffer.arrangeNewBgm(_newBgm, AudioManager._currentBgm);

        AudioManager._bgmArray.unshift(newBgm);

        // 無名BGMも曲として扱うが、バッファーとしてはnull
        if (newBgm.name === "") {
          AudioManager._bgmBufferArray.unshift(null);
        } else if (newBgm.name !== null) {
          // 暗号化されたオーディオファイルの場合 @TODO 通らないっぽいので消してもいいかも
          if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
            var ext = AudioManager.audioFileExt();
            var url = AudioManager._path + 'bgm/' + encodeURIComponent(bgm.name) + ext;
            url = Decrypter.extToEncryptExt(url);
            Decrypter.decryptHTML5Audio(url, bgm, bgm.pos);
            AudioManager._blobUrl = url;
          }

          AudioManager._bgmBufferArray.unshift(AudioManager.createBuffer('bgm', newBgm.name));
        } else {
          console.warn("!!WARN!! next bgm name is null @ unshiftBuffer");
          AudioManager._bgmBufferArray.unshift(null); // _bgmArray の個数と整合性を保つため挿入
        }
      }

      /**
       * バッファーの個数を数える
       *
       * @return Number
       */

    }, {
      key: "countBuffers",
      value: function countBuffers() {
        return AudioManager._bgmBufferArray.length;
      }

      /**
       * すべてのバッファーの再生を止める
       */

    }, {
      key: "muteAllBuffers",
      value: function muteAllBuffers() {
        AudioManager._bgmBufferArray.forEach(function (buffer) {
          if (buffer !== null) {
            buffer.stop();
          }
        });
      }

      /**
       * すべてのバッファーを再生する
       */

    }, {
      key: "playAllBuffers",
      value: function playAllBuffers() {
        AudioManager._bgmBufferArray.forEach(function (buffer, index) {
          if (buffer !== null) {
            var audioParameter = AudioManager._bgmArray[index];

            if (audioParameter !== null) {
              AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, audioParameter);
              buffer.play(true, audioParameter.pos || 0);
            }
          }
        });
      }

      /**
       * index(0~)を指定し、対象のバッファーを再生する
       *
       * @param _index: Number 対象バッファーの、バッファー配列におけるインデックス(0~)
       */

    }, {
      key: "playBufferByIndex",
      value: function playBufferByIndex(_index) {
        var index = parseInt(_index);
        var length = BgmBuffer.countBuffers();

        if (0 <= index && index < length) {
          var buffer = AudioManager._bgmBufferArray[index];

          if (buffer !== null) {
            var audioParameter = AudioManager._bgmArray[index];

            if (audioParameter !== null) {
              AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, audioParameter);
              buffer.play(true, audioParameter.pos || 0);
            }
          }
        } else {
          console.warn("!!WARN!! index number is not valid @ playBufferByIndex");
        }
      }

      /**
       * バッファーを指定個数に減らす
       *
       * @param quantity: Number この数に buffer の個数を減らす
       */

    }, {
      key: "reduceBuffers",
      value: function reduceBuffers(_quantity) {
        var quantity = parseInt(_quantity);
        var length = BgmBuffer.countBuffers();

        for (var i = quantity; i < length; ++i) {
          if (AudioManager._bgmBufferArray[i] !== null) {
            AudioManager._bgmBufferArray[i].stop();
            AudioManager._bgmBufferArray[i] = null;
          }
        }
        AudioManager._bgmArray = AudioManager._bgmArray.slice(0, quantity);
        AudioManager._bgmBufferArray = AudioManager._bgmBufferArray.slice(0, quantity);
      }

      /**
       * index(0~)を指定し、対象のバッファーを削除する
       *
       * @param _index: Number 対象バッファーの、バッファー配列におけるインデックス(0~)
       */

    }, {
      key: "removeBufferByIndex",
      value: function removeBufferByIndex(_index) {
        var index = parseInt(_index);
        var length = BgmBuffer.countBuffers();

        var newBgmArray = [];
        var newBgmBufferArray = [];

        if (0 <= index && index < length) {
          for (var i = 0; i < length; ++i) {
            if (i !== index) {
              newBgmArray.push(AudioManager._bgmArray[i]);
              newBgmBufferArray.push(AudioManager._bgmBufferArray[i]);
            } else {
              AudioManager._bgmBufferArray[i].stop();
              AudioManager._bgmBufferArray[i] = null;
              AudioManager._bgmArray[i] = null;
            }
          }

          AudioManager._bgmArray = newBgmArray;
          AudioManager._bgmBufferArray = newBgmBufferArray;
        } else {
          console.warn("!!WARN!! index number is not valid @ removeBufferByIndex");
        }
      }

      /**
       * index(0~)を指定し、対象のバッファーをアップデート
       *
       * @param _index: Number アップデート対象とするバッファーの、バッファー配列におけるインデックス(0~)
       * @param _newBgm: Array 例 {name: "bgm_title", volume: 90, pitch: 100, pan: 0, pos: 0}
       */

    }, {
      key: "updateBufferByIndex",
      value: function updateBufferByIndex(_index, _newBgm) {
        var index = parseInt(_index);
        var length = BgmBuffer.countBuffers();

        if (0 <= index && index < length) {
          var buffer = AudioManager._bgmBufferArray[index];
          var currentBgm = AudioManager._bgmArray[index];
          var newBgm = BgmBuffer.arrangeNewBgm(_newBgm, currentBgm);

          AudioManager._bgmArray[index] = newBgm;
          AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, newBgm);
        } else {
          console.warn("!!WARN!! index number is not valid @ updateBufferByIndex");
        }
      }

      /**
       * BGM名をもとにバッファー一覧を検索し、対象のバッファーをアップデート
       *
       * @param _bgmName: String 更新したい BGM名
       * @param _newBgm: Array 例 {name: "bgm_title", volume: 90, pitch: 100, pan: 0, pos: 0}
       */

    }, {
      key: "updateBufferByBgmName",
      value: function updateBufferByBgmName(_bgmName, _newBgm) {
        var bgmName = String(_bgmName);

        AudioManager._bgmArray.forEach(function (bgm, index) {
          if (bgm.name === bgmName) {
            var buffer = AudioManager._bgmBufferArray[index];
            var currentBgm = AudioManager._bgmArray[index];
            var newBgm = BgmBuffer.arrangeNewBgm(_newBgm, currentBgm);

            AudioManager._bgmArray[index] = newBgm;
            AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, newBgm);
          }
        });
      }

      /**
       * 未定義の値は currentBgm の値を使うよう調整
       *
       * @param _newBgm: Array 新しい BGM
       * @param _currentBgm: Array 現在の BGM
       * @return newBgm: Array 調整された新しい BGM
       */

    }, {
      key: "arrangeNewBgm",
      value: function arrangeNewBgm(_newBgm, _currentBgm) {
        var newBgm = _newBgm;

        if (newBgm.name === null) {
          newBgm.name = _currentBgm.name;
        }
        if (newBgm.volume === null) {
          newBgm.volume = _currentBgm ? _currentBgm.volume : 90;
        }
        if (newBgm.pitch === null) {
          newBgm.pitch = _currentBgm ? _currentBgm.pitch : 100;
        }
        if (newBgm.pan === null) {
          newBgm.pan = _currentBgm ? _currentBgm.pan : 0;
        }
        if (newBgm.pos === null) {
          newBgm.pos = _currentBgm ? _currentBgm.pos : 0;
        }

        return newBgm;
      }

      /**
       * index(0~)を指定し、対象のバッファーをフェードイン
       *
       * @param _index: Number アップデート対象とするバッファーの、バッファー配列におけるインデックス(0~)
       * @param _fadeDurationSec: Number フェードインにかける時間（秒）
       */

    }, {
      key: "fadeInBufferByIndex",
      value: function fadeInBufferByIndex(_index, _fadeDurationSec) {
        var index = parseInt(_index);
        var fadeDurationSec = Number(_fadeDurationSec);
        var length = BgmBuffer.countBuffers();

        if (0 <= index && index < length) {
          var buffer = AudioManager._bgmBufferArray[index];

          if (buffer !== null) {
            buffer.fadeIn(fadeDurationSec);
          }
        } else {
          console.warn("!!WARN!! index number is not valid @ fadeInBufferByIndex");
        }
      }

      /**
       * index(0~)を指定し、対象のバッファーをフェードアウト
       *
       * @param _index: Number アップデート対象とするバッファーの、バッファー配列におけるインデックス(0~)
       * @param _fadeDurationSec: Number フェードアウトにかける時間（秒）
       */

    }, {
      key: "fadeOutBufferByIndex",
      value: function fadeOutBufferByIndex(_index, _fadeDurationSec) {
        var index = parseInt(_index);
        var fadeDurationSec = Number(_fadeDurationSec);
        var length = BgmBuffer.countBuffers();

        if (0 <= index && index < length) {
          var buffer = AudioManager._bgmBufferArray[index];

          if (buffer !== null) {
            buffer.fadeOut(fadeDurationSec);
          }
        } else {
          console.warn("!!WARN!! index number is not valid @ fadeOutBufferByIndex");
        }
      }
    }, {
      key: "getBuffersPositionByIndex",
      value: function getBuffersPositionByIndex(_index) {
        var index = parseInt(_index);
        var length = BgmBuffer.countBuffers();

        if (0 <= index && index < length) {
          var buffer = AudioManager._bgmBufferArray[index];

          if (buffer !== null) {
            return buffer.seek() || 0;
          } else {
            return null;
          }
        } else {
          console.warn("!!WARN!! index number is not valid @ fadeInBufferByIndex");
        }
      }
    }]);

    return BgmBuffer;
  }();

  var CrossFadeBgm = function () {
    function CrossFadeBgm() {
      _classCallCheck(this, CrossFadeBgm);

      // プラグインパラメーターからデフォルトフェード時間を設定
      var parameters = PluginManager.parameters(pluginName);
      this._defaultDurationSec = Number(parameters["Default Fade Duration Sec"]);
      this.durationSec = this.defaultDurationSec;

      this.bgmBuffer = new BgmBuffer();

      this.nextBgm = {
        name: ""
      };
    }

    /** defaultDurationSec を取得、set はしない */


    _createClass(CrossFadeBgm, [{
      key: "startCrossFade",


      /** クロスフェードを開始 */
      value: function startCrossFade() {
        if (AudioManager._currentBgm !== null) {
          if (this.nextBgm.name !== AudioManager._currentBgm.name) {
            this.nextBgm = BgmBuffer.arrangeNewBgm(this.nextBgm, AudioManager._currentBgm);

            var position = BgmBuffer.getBuffersPositionByIndex(0);
            this.nextBgm.pos = position;
            AudioManager._currentBgm.pos = position;

            BgmBuffer.unshiftBuffer(this.nextBgm);
            BgmBuffer.reduceBuffers(2);
            BgmBuffer.playAllBuffers();

            BgmBuffer.fadeInBufferByIndex(0, this.durationSec * 0.75);
            BgmBuffer.fadeOutBufferByIndex(1, this.durationSec);
          }
        } else {
          BgmBuffer.unshiftBuffer(this.nextBgm);
          BgmBuffer.reduceBuffers(2);
          BgmBuffer.playAllBuffers();
          BgmBuffer.fadeInBufferByIndex(0, this.durationSec * 0.75);
        }
      }

      /** フェード時間(s)を設定 */

    }, {
      key: "setDuration",
      value: function setDuration(durationSec) {
        this.durationSec = Number(durationSec);
      }

      /** フェード時間(s)をデフォルトにリセット */

    }, {
      key: "resetDuration",
      value: function resetDuration() {
        this.durationSec = this.defaultDurationSec;
      }

      /**
       * 次に流すBGMをまとめて設定
       *
       * name,volume,pan,pitch,pos の順でまとめて書く
       * カンマのあとに空白文字を置かないこと
       *
       * @param _args: String
       */

    }, {
      key: "setAll",
      value: function setAll(_args) {
        var argsArray = _args.split(",");

        var name = !!argsArray[0] && argsArray[0] !== "" ? String(argsArray[0]) : null;
        var volume = !!argsArray[1] && argsArray[1] !== "" ? Number(argsArray[1]) : null;
        var pan = !!argsArray[2] && argsArray[2] !== "" ? Number(argsArray[2]) : null;
        var pitch = !!argsArray[3] && argsArray[3] !== "" ? Number(argsArray[3]) : null;
        var pos = !!argsArray[4] && argsArray[4] !== "" ? Number(argsArray[4]) : null;

        this.nextBgm = {
          name: name,
          volume: volume,
          pan: pan,
          pitch: pitch,
          pos: pos
        };
      }

      /**
       * プラグインコマンドを登録
       */

    }, {
      key: "defaultDurationSec",
      get: function get() {
        return this._defaultDurationSec;
      }
    }], [{
      key: "initPluginCommands",
      value: function initPluginCommands() {
        var crossFadeBgmClass = new CrossFadeBgm();

        var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;

        Game_Interpreter.prototype.pluginCommand = function (command, args) {
          _Game_Interpreter_pluginCommand.call(this, command, args);
          if (command === "CrossFadeBgm") {
            switch (args[0]) {
              case "set":
                crossFadeBgmClass.setAll(args[1]);
                break;
              case "start":
                crossFadeBgmClass.startCrossFade();
                break;
              case "durationSec":
                crossFadeBgmClass.setDuration(args[1]);
                break;
              case "resetDuration":
                crossFadeBgmClass.resetDuration();
                break;
            }
          }
        };
      }
    }]);

    return CrossFadeBgm;
  }();

  CrossFadeBgm.initPluginCommands();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkhUTl9Dcm9zc0ZhZGVCZ20uanMiXSwibmFtZXMiOlsicGx1Z2luTmFtZSIsIkJnbUJ1ZmZlciIsImV4dGVuZEF1ZGlvTWFuYWdlciIsInNldEluZGV4Rm9yQ3VycmVudEJnbSIsIkF1ZGlvTWFuYWdlciIsIl9iZ21BcnJheSIsIl9iZ21CdWZmZXJBcnJheSIsInBsYXlCZ20iLCJiZ20iLCJwb3MiLCJpc0N1cnJlbnRCZ20iLCJ1cGRhdGVCZ21QYXJhbWV0ZXJzIiwic3RvcEJnbSIsIm5hbWUiLCJEZWNyeXB0ZXIiLCJoYXNFbmNyeXB0ZWRBdWRpbyIsInNob3VsZFVzZUh0bWw1QXVkaW8iLCJwbGF5RW5jcnlwdGVkQmdtIiwicHVzaEJ1ZmZlciIsIl9tZUJ1ZmZlciIsInBsYXlBbGxCdWZmZXJzIiwiY3JlYXRlRGVjcnlwdEJ1ZmZlciIsInVybCIsIl9ibG9iVXJsIiwiZm9yRWFjaCIsImJ1ZmZlciIsInN0b3AiLCJfaW5kZXhGb3JDdXJyZW50QmdtIiwiaW5kZXhGb3JDdXJyZW50QmdtIiwicGFyc2VJbnQiLCJsZW5ndGgiLCJjb3VudEJ1ZmZlcnMiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImdldCIsInNldCIsIl9idWZmZXIiLCJjb25maWd1cmFibGUiLCJfYmdtIiwiY29uc29sZSIsIndhcm4iLCJfbmV3QmdtIiwibmV3QmdtIiwiYXJyYW5nZU5ld0JnbSIsIl9jdXJyZW50QmdtIiwicHVzaCIsImV4dCIsImF1ZGlvRmlsZUV4dCIsIl9wYXRoIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZXh0VG9FbmNyeXB0RXh0IiwiZGVjcnlwdEhUTUw1QXVkaW8iLCJjcmVhdGVCdWZmZXIiLCJ1bnNoaWZ0IiwiaW5kZXgiLCJhdWRpb1BhcmFtZXRlciIsInVwZGF0ZUJ1ZmZlclBhcmFtZXRlcnMiLCJfYmdtVm9sdW1lIiwicGxheSIsIl9pbmRleCIsIl9xdWFudGl0eSIsInF1YW50aXR5IiwiaSIsInNsaWNlIiwibmV3QmdtQXJyYXkiLCJuZXdCZ21CdWZmZXJBcnJheSIsImN1cnJlbnRCZ20iLCJfYmdtTmFtZSIsImJnbU5hbWUiLCJTdHJpbmciLCJ2b2x1bWUiLCJwaXRjaCIsInBhbiIsIl9mYWRlRHVyYXRpb25TZWMiLCJmYWRlRHVyYXRpb25TZWMiLCJOdW1iZXIiLCJmYWRlSW4iLCJmYWRlT3V0Iiwic2VlayIsIkNyb3NzRmFkZUJnbSIsInBhcmFtZXRlcnMiLCJQbHVnaW5NYW5hZ2VyIiwiX2RlZmF1bHREdXJhdGlvblNlYyIsImR1cmF0aW9uU2VjIiwiZGVmYXVsdER1cmF0aW9uU2VjIiwiYmdtQnVmZmVyIiwibmV4dEJnbSIsInBvc2l0aW9uIiwiZ2V0QnVmZmVyc1Bvc2l0aW9uQnlJbmRleCIsInVuc2hpZnRCdWZmZXIiLCJyZWR1Y2VCdWZmZXJzIiwiZmFkZUluQnVmZmVyQnlJbmRleCIsImZhZGVPdXRCdWZmZXJCeUluZGV4IiwiX2FyZ3MiLCJhcmdzQXJyYXkiLCJzcGxpdCIsImNyb3NzRmFkZUJnbUNsYXNzIiwiX0dhbWVfSW50ZXJwcmV0ZXJfcGx1Z2luQ29tbWFuZCIsIkdhbWVfSW50ZXJwcmV0ZXIiLCJwcm90b3R5cGUiLCJwbHVnaW5Db21tYW5kIiwiY29tbWFuZCIsImFyZ3MiLCJjYWxsIiwic2V0QWxsIiwic3RhcnRDcm9zc0ZhZGUiLCJzZXREdXJhdGlvbiIsInJlc2V0RHVyYXRpb24iLCJpbml0UGx1Z2luQ29tbWFuZHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTJDQSxDQUFDLFlBQVc7QUFDVjs7QUFFQSxNQUFJQSxhQUFhLGtCQUFqQjs7QUFFQTs7Ozs7QUFMVSxNQVNKQyxTQVRJO0FBV1IseUJBQWM7QUFBQTs7QUFDWkEsZ0JBQVVDLGtCQUFWO0FBQ0FELGdCQUFVRSxxQkFBVixDQUFnQyxDQUFoQztBQUNEOztBQUVEOzs7Ozs7O0FBaEJRO0FBQUE7QUFBQSwyQ0FxQm9CO0FBQzFCQyxxQkFBYUMsU0FBYixHQUF5QixFQUF6QjtBQUNBRCxxQkFBYUUsZUFBYixHQUErQixFQUEvQjs7QUFFQTtBQUNBRixxQkFBYUcsT0FBYixHQUF1QixVQUFTQyxHQUFULEVBQWNDLEdBQWQsRUFBbUI7QUFDeEMsY0FBSUwsYUFBYU0sWUFBYixDQUEwQkYsR0FBMUIsQ0FBSixFQUFvQztBQUNsQ0oseUJBQWFPLG1CQUFiLENBQWlDSCxHQUFqQztBQUNELFdBRkQsTUFFTztBQUNMSix5QkFBYVEsT0FBYjtBQUNBLGdCQUFJSixJQUFJSyxJQUFKLEtBQWEsSUFBakIsRUFBdUI7QUFDckIsa0JBQUdDLFVBQVVDLGlCQUFWLElBQStCWCxhQUFhWSxtQkFBYixFQUFsQyxFQUFxRTtBQUNuRVosNkJBQWFhLGdCQUFiLENBQThCVCxHQUE5QixFQUFtQ0MsR0FBbkM7QUFDRCxlQUZELE1BR0s7QUFDSEQsb0JBQUlDLEdBQUosR0FBVUEsR0FBVjtBQUNBUiwwQkFBVWlCLFVBQVYsQ0FBcUJWLEdBQXJCO0FBQ0E7QUFDQUosNkJBQWFPLG1CQUFiLENBQWlDSCxHQUFqQztBQUNBLG9CQUFJLENBQUNKLGFBQWFlLFNBQWxCLEVBQTZCO0FBQzNCO0FBQ0FsQiw0QkFBVW1CLGNBQVY7QUFDRDtBQUNGO0FBQ0Y7QUFDRjtBQUNEO0FBQ0QsU0F0QkQ7O0FBd0JBO0FBQ0FoQixxQkFBYWlCLG1CQUFiLEdBQW1DLFVBQVNDLEdBQVQsRUFBY2QsR0FBZCxFQUFtQkMsR0FBbkIsRUFBdUI7QUFDeERMLHVCQUFhbUIsUUFBYixHQUF3QkQsR0FBeEI7QUFDQWQsY0FBSUMsR0FBSixHQUFVQSxHQUFWO0FBQ0FSLG9CQUFVaUIsVUFBVixDQUFxQlYsR0FBckI7QUFDQTtBQUNBSix1QkFBYU8sbUJBQWIsQ0FBaUNILEdBQWpDO0FBQ0EsY0FBSSxDQUFDSixhQUFhZSxTQUFsQixFQUE2QjtBQUMzQjtBQUNBbEIsc0JBQVVtQixjQUFWO0FBQ0Q7QUFDRDtBQUNELFNBWEQ7O0FBYUE7Ozs7QUFJQWhCLHFCQUFhUSxPQUFiLEdBQXVCLFlBQVc7QUFDaENSLHVCQUFhRSxlQUFiLENBQTZCa0IsT0FBN0IsQ0FBcUMsVUFBU0MsTUFBVCxFQUFpQjtBQUNwRCxnQkFBR0EsV0FBVyxJQUFkLEVBQW9CO0FBQ2xCQSxxQkFBT0MsSUFBUDtBQUNBRCx1QkFBUyxJQUFUO0FBQ0Q7QUFDRixXQUxEO0FBTUF4QixvQkFBVUUscUJBQVYsQ0FBZ0MsQ0FBaEM7QUFDQUMsdUJBQWFDLFNBQWIsR0FBeUIsRUFBekI7QUFDQUQsdUJBQWFFLGVBQWIsR0FBK0IsRUFBL0I7QUFDRCxTQVZEO0FBV0Q7O0FBRUQ7Ozs7Ozs7O0FBakZRO0FBQUE7QUFBQSw0Q0F3RnFCcUIsbUJBeEZyQixFQXdGMEM7QUFDaEQsWUFBSUMscUJBQXFCQyxTQUFTRixtQkFBVCxDQUF6QjtBQUNBLFlBQUlHLFNBQVM3QixVQUFVOEIsWUFBVixFQUFiOztBQUVBLFlBQUdILHVCQUF1QixDQUF2QixJQUE2QixLQUFLQSxrQkFBTCxJQUEyQkEscUJBQXFCRSxNQUFoRixFQUF5RjtBQUN2RkUsaUJBQU9DLGNBQVAsQ0FBc0I3QixZQUF0QixFQUFvQyxZQUFwQyxFQUFrRDtBQUNoRDhCLGlCQUFLLGVBQVc7QUFDZCxxQkFBTzlCLGFBQWFFLGVBQWIsQ0FBNkJzQixrQkFBN0IsQ0FBUDtBQUNELGFBSCtDO0FBSWhETyxpQkFBSyxhQUFTQyxPQUFULEVBQWtCO0FBQ3JCaEMsMkJBQWFFLGVBQWIsQ0FBNkJzQixrQkFBN0IsSUFBbURRLE9BQW5EO0FBQ0QsYUFOK0M7QUFPaERDLDBCQUFjO0FBUGtDLFdBQWxEOztBQVVBTCxpQkFBT0MsY0FBUCxDQUFzQjdCLFlBQXRCLEVBQW9DLGFBQXBDLEVBQW1EO0FBQ2pEOEIsaUJBQUssZUFBVztBQUNkLHFCQUFPOUIsYUFBYUMsU0FBYixDQUF1QnVCLGtCQUF2QixDQUFQO0FBQ0QsYUFIZ0Q7QUFJakRPLGlCQUFLLGFBQVNHLElBQVQsRUFBZTtBQUNsQmxDLDJCQUFhQyxTQUFiLENBQXVCdUIsa0JBQXZCLElBQTZDVSxJQUE3QztBQUNELGFBTmdEO0FBT2pERCwwQkFBYztBQVBtQyxXQUFuRDtBQVNELFNBcEJELE1Bb0JPO0FBQ0xFLGtCQUFRQyxJQUFSLENBQWEsNERBQWI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7QUFySFE7QUFBQTtBQUFBLGlDQTBIVUMsT0ExSFYsRUEwSG1CO0FBQ3pCO0FBQ0EsWUFBSUMsU0FBU3pDLFVBQVUwQyxhQUFWLENBQXdCRixPQUF4QixFQUFpQ3JDLGFBQWF3QyxXQUE5QyxDQUFiOztBQUVBeEMscUJBQWFDLFNBQWIsQ0FBdUJ3QyxJQUF2QixDQUE0QkgsTUFBNUI7O0FBRUE7QUFDQSxZQUFHQSxPQUFPN0IsSUFBUCxLQUFnQixFQUFuQixFQUF1QjtBQUNyQlQsdUJBQWFFLGVBQWIsQ0FBNkJ1QyxJQUE3QixDQUFrQyxJQUFsQztBQUNELFNBRkQsTUFFTyxJQUFHSCxPQUFPN0IsSUFBUCxLQUFnQixJQUFuQixFQUF5QjtBQUM5QjtBQUNBLGNBQUdDLFVBQVVDLGlCQUFWLElBQStCWCxhQUFhWSxtQkFBYixFQUFsQyxFQUFxRTtBQUNuRSxnQkFBSThCLE1BQU0xQyxhQUFhMkMsWUFBYixFQUFWO0FBQ0EsZ0JBQUl6QixNQUFNbEIsYUFBYTRDLEtBQWIsR0FBcUIsTUFBckIsR0FBOEJDLG1CQUFtQnpDLElBQUlLLElBQXZCLENBQTlCLEdBQTZEaUMsR0FBdkU7QUFDQXhCLGtCQUFNUixVQUFVb0MsZUFBVixDQUEwQjVCLEdBQTFCLENBQU47QUFDQVIsc0JBQVVxQyxpQkFBVixDQUE0QjdCLEdBQTVCLEVBQWlDZCxHQUFqQyxFQUFzQ0EsSUFBSUMsR0FBMUM7QUFDQUwseUJBQWFtQixRQUFiLEdBQXdCRCxHQUF4QjtBQUNEO0FBQ0RsQix1QkFBYUUsZUFBYixDQUE2QnVDLElBQTdCLENBQWtDekMsYUFBYWdELFlBQWIsQ0FBMEIsS0FBMUIsRUFBaUNWLE9BQU83QixJQUF4QyxDQUFsQztBQUNELFNBVk0sTUFVQTtBQUNMMEIsa0JBQVFDLElBQVIsQ0FBYSw2Q0FBYjtBQUNBcEMsdUJBQWFFLGVBQWIsQ0FBNkJ1QyxJQUE3QixDQUFrQyxJQUFsQyxFQUZLLENBRW9DO0FBQzFDO0FBQ0Q7QUFDRDs7QUFFRDs7Ozs7O0FBcEpRO0FBQUE7QUFBQSxvQ0F5SmFKLE9BekpiLEVBeUpzQjtBQUM1QjtBQUNBLFlBQUlDLFNBQVN6QyxVQUFVMEMsYUFBVixDQUF3QkYsT0FBeEIsRUFBaUNyQyxhQUFhd0MsV0FBOUMsQ0FBYjs7QUFFQXhDLHFCQUFhQyxTQUFiLENBQXVCZ0QsT0FBdkIsQ0FBK0JYLE1BQS9COztBQUVBO0FBQ0EsWUFBR0EsT0FBTzdCLElBQVAsS0FBZ0IsRUFBbkIsRUFBdUI7QUFDckJULHVCQUFhRSxlQUFiLENBQTZCK0MsT0FBN0IsQ0FBcUMsSUFBckM7QUFDRCxTQUZELE1BRU8sSUFBR1gsT0FBTzdCLElBQVAsS0FBZ0IsSUFBbkIsRUFBeUI7QUFDOUI7QUFDQSxjQUFHQyxVQUFVQyxpQkFBVixJQUErQlgsYUFBYVksbUJBQWIsRUFBbEMsRUFBcUU7QUFDbkUsZ0JBQUk4QixNQUFNMUMsYUFBYTJDLFlBQWIsRUFBVjtBQUNBLGdCQUFJekIsTUFBTWxCLGFBQWE0QyxLQUFiLEdBQXFCLE1BQXJCLEdBQThCQyxtQkFBbUJ6QyxJQUFJSyxJQUF2QixDQUE5QixHQUE2RGlDLEdBQXZFO0FBQ0F4QixrQkFBTVIsVUFBVW9DLGVBQVYsQ0FBMEI1QixHQUExQixDQUFOO0FBQ0FSLHNCQUFVcUMsaUJBQVYsQ0FBNEI3QixHQUE1QixFQUFpQ2QsR0FBakMsRUFBc0NBLElBQUlDLEdBQTFDO0FBQ0FMLHlCQUFhbUIsUUFBYixHQUF3QkQsR0FBeEI7QUFDRDs7QUFFRGxCLHVCQUFhRSxlQUFiLENBQTZCK0MsT0FBN0IsQ0FBcUNqRCxhQUFhZ0QsWUFBYixDQUEwQixLQUExQixFQUFpQ1YsT0FBTzdCLElBQXhDLENBQXJDO0FBQ0QsU0FYTSxNQVdBO0FBQ0wwQixrQkFBUUMsSUFBUixDQUFhLGdEQUFiO0FBQ0FwQyx1QkFBYUUsZUFBYixDQUE2QitDLE9BQTdCLENBQXFDLElBQXJDLEVBRkssQ0FFdUM7QUFDN0M7QUFDRDtBQUNEOztBQUVEOzs7Ozs7QUFwTFE7QUFBQTtBQUFBLHFDQXlMYztBQUNwQixlQUFPakQsYUFBYUUsZUFBYixDQUE2QndCLE1BQXBDO0FBQ0Q7O0FBRUQ7Ozs7QUE3TFE7QUFBQTtBQUFBLHVDQWdNZ0I7QUFDdEIxQixxQkFBYUUsZUFBYixDQUE2QmtCLE9BQTdCLENBQXFDLFVBQVNDLE1BQVQsRUFBaUI7QUFDcEQsY0FBR0EsV0FBVyxJQUFkLEVBQW9CO0FBQ2xCQSxtQkFBT0MsSUFBUDtBQUNEO0FBQ0YsU0FKRDtBQUtEOztBQUVEOzs7O0FBeE1RO0FBQUE7QUFBQSx1Q0EyTWdCO0FBQ3RCdEIscUJBQWFFLGVBQWIsQ0FBNkJrQixPQUE3QixDQUFxQyxVQUFTQyxNQUFULEVBQWlCNkIsS0FBakIsRUFBd0I7QUFDM0QsY0FBRzdCLFdBQVcsSUFBZCxFQUFvQjtBQUNsQixnQkFBSThCLGlCQUFpQm5ELGFBQWFDLFNBQWIsQ0FBdUJpRCxLQUF2QixDQUFyQjs7QUFFQSxnQkFBR0MsbUJBQW1CLElBQXRCLEVBQTRCO0FBQzFCbkQsMkJBQWFvRCxzQkFBYixDQUFvQy9CLE1BQXBDLEVBQTRDckIsYUFBYXFELFVBQXpELEVBQXFFRixjQUFyRTtBQUNBOUIscUJBQU9pQyxJQUFQLENBQVksSUFBWixFQUFrQkgsZUFBZTlDLEdBQWYsSUFBc0IsQ0FBeEM7QUFDRDtBQUNGO0FBQ0YsU0FURDtBQVVEOztBQUVEOzs7Ozs7QUF4TlE7QUFBQTtBQUFBLHdDQTZOaUJrRCxNQTdOakIsRUE2TnlCO0FBQy9CLFlBQUlMLFFBQVF6QixTQUFTOEIsTUFBVCxDQUFaO0FBQ0EsWUFBSTdCLFNBQVM3QixVQUFVOEIsWUFBVixFQUFiOztBQUVBLFlBQUcsS0FBS3VCLEtBQUwsSUFBY0EsUUFBUXhCLE1BQXpCLEVBQWlDO0FBQy9CLGNBQUlMLFNBQVNyQixhQUFhRSxlQUFiLENBQTZCZ0QsS0FBN0IsQ0FBYjs7QUFFQSxjQUFHN0IsV0FBVyxJQUFkLEVBQW9CO0FBQ2xCLGdCQUFJOEIsaUJBQWlCbkQsYUFBYUMsU0FBYixDQUF1QmlELEtBQXZCLENBQXJCOztBQUVBLGdCQUFHQyxtQkFBbUIsSUFBdEIsRUFBNEI7QUFDMUJuRCwyQkFBYW9ELHNCQUFiLENBQW9DL0IsTUFBcEMsRUFBNENyQixhQUFhcUQsVUFBekQsRUFBcUVGLGNBQXJFO0FBQ0E5QixxQkFBT2lDLElBQVAsQ0FBWSxJQUFaLEVBQWtCSCxlQUFlOUMsR0FBZixJQUFzQixDQUF4QztBQUNEO0FBQ0Y7QUFDRixTQVhELE1BV087QUFDTDhCLGtCQUFRQyxJQUFSLENBQWEsd0RBQWI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7QUFqUFE7QUFBQTtBQUFBLG9DQXNQYW9CLFNBdFBiLEVBc1B3QjtBQUM5QixZQUFJQyxXQUFXaEMsU0FBUytCLFNBQVQsQ0FBZjtBQUNBLFlBQUk5QixTQUFTN0IsVUFBVThCLFlBQVYsRUFBYjs7QUFFQSxhQUFJLElBQUkrQixJQUFJRCxRQUFaLEVBQXNCQyxJQUFJaEMsTUFBMUIsRUFBa0MsRUFBRWdDLENBQXBDLEVBQXVDO0FBQ3JDLGNBQUcxRCxhQUFhRSxlQUFiLENBQTZCd0QsQ0FBN0IsTUFBb0MsSUFBdkMsRUFBNkM7QUFDM0MxRCx5QkFBYUUsZUFBYixDQUE2QndELENBQTdCLEVBQWdDcEMsSUFBaEM7QUFDQXRCLHlCQUFhRSxlQUFiLENBQTZCd0QsQ0FBN0IsSUFBa0MsSUFBbEM7QUFDRDtBQUNGO0FBQ0QxRCxxQkFBYUMsU0FBYixHQUF5QkQsYUFBYUMsU0FBYixDQUF1QjBELEtBQXZCLENBQTZCLENBQTdCLEVBQWdDRixRQUFoQyxDQUF6QjtBQUNBekQscUJBQWFFLGVBQWIsR0FBK0JGLGFBQWFFLGVBQWIsQ0FBNkJ5RCxLQUE3QixDQUFtQyxDQUFuQyxFQUFzQ0YsUUFBdEMsQ0FBL0I7QUFDRDs7QUFFRDs7Ozs7O0FBcFFRO0FBQUE7QUFBQSwwQ0F5UW1CRixNQXpRbkIsRUF5UTJCO0FBQ2pDLFlBQUlMLFFBQVF6QixTQUFTOEIsTUFBVCxDQUFaO0FBQ0EsWUFBSTdCLFNBQVM3QixVQUFVOEIsWUFBVixFQUFiOztBQUVBLFlBQUlpQyxjQUFjLEVBQWxCO0FBQ0EsWUFBSUMsb0JBQW9CLEVBQXhCOztBQUVBLFlBQUcsS0FBS1gsS0FBTCxJQUFjQSxRQUFReEIsTUFBekIsRUFBaUM7QUFDL0IsZUFBSSxJQUFJZ0MsSUFBSSxDQUFaLEVBQWVBLElBQUloQyxNQUFuQixFQUEyQixFQUFFZ0MsQ0FBN0IsRUFBZ0M7QUFDOUIsZ0JBQUdBLE1BQU1SLEtBQVQsRUFBZ0I7QUFDZFUsMEJBQVluQixJQUFaLENBQWlCekMsYUFBYUMsU0FBYixDQUF1QnlELENBQXZCLENBQWpCO0FBQ0FHLGdDQUFrQnBCLElBQWxCLENBQXVCekMsYUFBYUUsZUFBYixDQUE2QndELENBQTdCLENBQXZCO0FBQ0QsYUFIRCxNQUdPO0FBQ0wxRCwyQkFBYUUsZUFBYixDQUE2QndELENBQTdCLEVBQWdDcEMsSUFBaEM7QUFDQXRCLDJCQUFhRSxlQUFiLENBQTZCd0QsQ0FBN0IsSUFBa0MsSUFBbEM7QUFDQTFELDJCQUFhQyxTQUFiLENBQXVCeUQsQ0FBdkIsSUFBNEIsSUFBNUI7QUFDRDtBQUNGOztBQUVEMUQsdUJBQWFDLFNBQWIsR0FBeUIyRCxXQUF6QjtBQUNBNUQsdUJBQWFFLGVBQWIsR0FBK0IyRCxpQkFBL0I7QUFDRCxTQWRELE1BY087QUFDTDFCLGtCQUFRQyxJQUFSLENBQWEsMERBQWI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7O0FBblNRO0FBQUE7QUFBQSwwQ0F5U21CbUIsTUF6U25CLEVBeVMyQmxCLE9BelMzQixFQXlTb0M7QUFDMUMsWUFBSWEsUUFBUXpCLFNBQVM4QixNQUFULENBQVo7QUFDQSxZQUFJN0IsU0FBUzdCLFVBQVU4QixZQUFWLEVBQWI7O0FBRUEsWUFBRyxLQUFLdUIsS0FBTCxJQUFjQSxRQUFReEIsTUFBekIsRUFBaUM7QUFDL0IsY0FBSUwsU0FBU3JCLGFBQWFFLGVBQWIsQ0FBNkJnRCxLQUE3QixDQUFiO0FBQ0EsY0FBSVksYUFBYTlELGFBQWFDLFNBQWIsQ0FBdUJpRCxLQUF2QixDQUFqQjtBQUNBLGNBQUlaLFNBQVN6QyxVQUFVMEMsYUFBVixDQUF3QkYsT0FBeEIsRUFBaUN5QixVQUFqQyxDQUFiOztBQUVBOUQsdUJBQWFDLFNBQWIsQ0FBdUJpRCxLQUF2QixJQUFnQ1osTUFBaEM7QUFDQXRDLHVCQUFhb0Qsc0JBQWIsQ0FBb0MvQixNQUFwQyxFQUE0Q3JCLGFBQWFxRCxVQUF6RCxFQUFxRWYsTUFBckU7QUFDRCxTQVBELE1BT087QUFDTEgsa0JBQVFDLElBQVIsQ0FBYSwwREFBYjtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7Ozs7QUF6VFE7QUFBQTtBQUFBLDRDQStUcUIyQixRQS9UckIsRUErVCtCMUIsT0EvVC9CLEVBK1R3QztBQUM5QyxZQUFJMkIsVUFBVUMsT0FBT0YsUUFBUCxDQUFkOztBQUVBL0QscUJBQWFDLFNBQWIsQ0FBdUJtQixPQUF2QixDQUErQixVQUFTaEIsR0FBVCxFQUFjOEMsS0FBZCxFQUFxQjtBQUNsRCxjQUFHOUMsSUFBSUssSUFBSixLQUFhdUQsT0FBaEIsRUFBeUI7QUFDdkIsZ0JBQUkzQyxTQUFTckIsYUFBYUUsZUFBYixDQUE2QmdELEtBQTdCLENBQWI7QUFDQSxnQkFBSVksYUFBYTlELGFBQWFDLFNBQWIsQ0FBdUJpRCxLQUF2QixDQUFqQjtBQUNBLGdCQUFJWixTQUFTekMsVUFBVTBDLGFBQVYsQ0FBd0JGLE9BQXhCLEVBQWlDeUIsVUFBakMsQ0FBYjs7QUFFQTlELHlCQUFhQyxTQUFiLENBQXVCaUQsS0FBdkIsSUFBZ0NaLE1BQWhDO0FBQ0F0Qyx5QkFBYW9ELHNCQUFiLENBQW9DL0IsTUFBcEMsRUFBNENyQixhQUFhcUQsVUFBekQsRUFBcUVmLE1BQXJFO0FBQ0Q7QUFDRixTQVREO0FBVUQ7O0FBRUQ7Ozs7Ozs7O0FBOVVRO0FBQUE7QUFBQSxvQ0FxVmFELE9BclZiLEVBcVZzQkcsV0FyVnRCLEVBcVZtQztBQUN6QyxZQUFJRixTQUFTRCxPQUFiOztBQUVBLFlBQUdDLE9BQU83QixJQUFQLEtBQWdCLElBQW5CLEVBQXlCO0FBQ3ZCNkIsaUJBQU83QixJQUFQLEdBQWMrQixZQUFZL0IsSUFBMUI7QUFDRDtBQUNELFlBQUc2QixPQUFPNEIsTUFBUCxLQUFrQixJQUFyQixFQUEyQjtBQUN6QjVCLGlCQUFPNEIsTUFBUCxHQUFnQjFCLGNBQWNBLFlBQVkwQixNQUExQixHQUFtQyxFQUFuRDtBQUNEO0FBQ0QsWUFBRzVCLE9BQU82QixLQUFQLEtBQWlCLElBQXBCLEVBQTBCO0FBQ3hCN0IsaUJBQU82QixLQUFQLEdBQWUzQixjQUFjQSxZQUFZMkIsS0FBMUIsR0FBa0MsR0FBakQ7QUFDRDtBQUNELFlBQUc3QixPQUFPOEIsR0FBUCxLQUFlLElBQWxCLEVBQXdCO0FBQ3RCOUIsaUJBQU84QixHQUFQLEdBQWE1QixjQUFjQSxZQUFZNEIsR0FBMUIsR0FBZ0MsQ0FBN0M7QUFDRDtBQUNELFlBQUc5QixPQUFPakMsR0FBUCxLQUFlLElBQWxCLEVBQXdCO0FBQ3RCaUMsaUJBQU9qQyxHQUFQLEdBQWFtQyxjQUFjQSxZQUFZbkMsR0FBMUIsR0FBZ0MsQ0FBN0M7QUFDRDs7QUFFRCxlQUFPaUMsTUFBUDtBQUNEOztBQUVEOzs7Ozs7O0FBM1dRO0FBQUE7QUFBQSwwQ0FpWG1CaUIsTUFqWG5CLEVBaVgyQmMsZ0JBalgzQixFQWlYNkM7QUFDbkQsWUFBSW5CLFFBQVF6QixTQUFTOEIsTUFBVCxDQUFaO0FBQ0EsWUFBSWUsa0JBQWtCQyxPQUFPRixnQkFBUCxDQUF0QjtBQUNBLFlBQUkzQyxTQUFTN0IsVUFBVThCLFlBQVYsRUFBYjs7QUFFQSxZQUFHLEtBQUt1QixLQUFMLElBQWNBLFFBQVF4QixNQUF6QixFQUFpQztBQUMvQixjQUFJTCxTQUFTckIsYUFBYUUsZUFBYixDQUE2QmdELEtBQTdCLENBQWI7O0FBRUEsY0FBRzdCLFdBQVcsSUFBZCxFQUFvQjtBQUNsQkEsbUJBQU9tRCxNQUFQLENBQWNGLGVBQWQ7QUFDRDtBQUNGLFNBTkQsTUFNTztBQUNMbkMsa0JBQVFDLElBQVIsQ0FBYSwwREFBYjtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7Ozs7QUFqWVE7QUFBQTtBQUFBLDJDQXVZb0JtQixNQXZZcEIsRUF1WTRCYyxnQkF2WTVCLEVBdVk4QztBQUNwRCxZQUFJbkIsUUFBUXpCLFNBQVM4QixNQUFULENBQVo7QUFDQSxZQUFJZSxrQkFBa0JDLE9BQU9GLGdCQUFQLENBQXRCO0FBQ0EsWUFBSTNDLFNBQVM3QixVQUFVOEIsWUFBVixFQUFiOztBQUVBLFlBQUcsS0FBS3VCLEtBQUwsSUFBY0EsUUFBUXhCLE1BQXpCLEVBQWlDO0FBQy9CLGNBQUlMLFNBQVNyQixhQUFhRSxlQUFiLENBQTZCZ0QsS0FBN0IsQ0FBYjs7QUFFQSxjQUFHN0IsV0FBVyxJQUFkLEVBQW9CO0FBQ2xCQSxtQkFBT29ELE9BQVAsQ0FBZUgsZUFBZjtBQUNEO0FBQ0YsU0FORCxNQU1PO0FBQ0xuQyxrQkFBUUMsSUFBUixDQUFhLDJEQUFiO0FBQ0Q7QUFDRjtBQXJaTztBQUFBO0FBQUEsZ0RBdVp5Qm1CLE1Bdlp6QixFQXVaaUM7QUFDdkMsWUFBSUwsUUFBUXpCLFNBQVM4QixNQUFULENBQVo7QUFDQSxZQUFJN0IsU0FBUzdCLFVBQVU4QixZQUFWLEVBQWI7O0FBRUEsWUFBRyxLQUFLdUIsS0FBTCxJQUFjQSxRQUFReEIsTUFBekIsRUFBaUM7QUFDL0IsY0FBSUwsU0FBU3JCLGFBQWFFLGVBQWIsQ0FBNkJnRCxLQUE3QixDQUFiOztBQUVBLGNBQUc3QixXQUFXLElBQWQsRUFBb0I7QUFDbEIsbUJBQVFBLE9BQU9xRCxJQUFQLE1BQWlCLENBQXpCO0FBQ0QsV0FGRCxNQUVPO0FBQ0wsbUJBQU8sSUFBUDtBQUNEO0FBQ0YsU0FSRCxNQVFPO0FBQ0x2QyxrQkFBUUMsSUFBUixDQUFhLDBEQUFiO0FBQ0Q7QUFDRjtBQXRhTzs7QUFBQTtBQUFBOztBQUFBLE1BeWFKdUMsWUF6YUk7QUEwYVIsNEJBQWM7QUFBQTs7QUFDWjtBQUNBLFVBQUlDLGFBQWFDLGNBQWNELFVBQWQsQ0FBeUJoRixVQUF6QixDQUFqQjtBQUNBLFdBQUtrRixtQkFBTCxHQUEyQlAsT0FBT0ssV0FBVywyQkFBWCxDQUFQLENBQTNCO0FBQ0EsV0FBS0csV0FBTCxHQUFtQixLQUFLQyxrQkFBeEI7O0FBRUEsV0FBS0MsU0FBTCxHQUFpQixJQUFJcEYsU0FBSixFQUFqQjs7QUFFQSxXQUFLcUYsT0FBTCxHQUFlO0FBQ2J6RSxjQUFNO0FBRE8sT0FBZjtBQUdEOztBQUVEOzs7QUF2YlE7QUFBQTs7O0FBNGJSO0FBNWJRLHVDQTZiUztBQUNmLFlBQUdULGFBQWF3QyxXQUFiLEtBQTZCLElBQWhDLEVBQXNDO0FBQ3BDLGNBQUcsS0FBSzBDLE9BQUwsQ0FBYXpFLElBQWIsS0FBc0JULGFBQWF3QyxXQUFiLENBQXlCL0IsSUFBbEQsRUFBd0Q7QUFDdEQsaUJBQUt5RSxPQUFMLEdBQWVyRixVQUFVMEMsYUFBVixDQUF3QixLQUFLMkMsT0FBN0IsRUFBc0NsRixhQUFhd0MsV0FBbkQsQ0FBZjs7QUFFQSxnQkFBSTJDLFdBQVd0RixVQUFVdUYseUJBQVYsQ0FBb0MsQ0FBcEMsQ0FBZjtBQUNBLGlCQUFLRixPQUFMLENBQWE3RSxHQUFiLEdBQW1COEUsUUFBbkI7QUFDQW5GLHlCQUFhd0MsV0FBYixDQUF5Qm5DLEdBQXpCLEdBQStCOEUsUUFBL0I7O0FBRUF0RixzQkFBVXdGLGFBQVYsQ0FBd0IsS0FBS0gsT0FBN0I7QUFDQXJGLHNCQUFVeUYsYUFBVixDQUF3QixDQUF4QjtBQUNBekYsc0JBQVVtQixjQUFWOztBQUVBbkIsc0JBQVUwRixtQkFBVixDQUE4QixDQUE5QixFQUFpQyxLQUFLUixXQUFMLEdBQW1CLElBQXBEO0FBQ0FsRixzQkFBVTJGLG9CQUFWLENBQStCLENBQS9CLEVBQWtDLEtBQUtULFdBQXZDO0FBQ0Q7QUFDRixTQWZELE1BZU87QUFDTGxGLG9CQUFVd0YsYUFBVixDQUF3QixLQUFLSCxPQUE3QjtBQUNBckYsb0JBQVV5RixhQUFWLENBQXdCLENBQXhCO0FBQ0F6RixvQkFBVW1CLGNBQVY7QUFDQW5CLG9CQUFVMEYsbUJBQVYsQ0FBOEIsQ0FBOUIsRUFBaUMsS0FBS1IsV0FBTCxHQUFtQixJQUFwRDtBQUNEO0FBQ0Y7O0FBRUQ7O0FBcmRRO0FBQUE7QUFBQSxrQ0FzZElBLFdBdGRKLEVBc2RpQjtBQUN2QixhQUFLQSxXQUFMLEdBQW1CUixPQUFPUSxXQUFQLENBQW5CO0FBQ0Q7O0FBRUQ7O0FBMWRRO0FBQUE7QUFBQSxzQ0EyZFE7QUFDZCxhQUFLQSxXQUFMLEdBQW1CLEtBQUtDLGtCQUF4QjtBQUNEOztBQUVEOzs7Ozs7Ozs7QUEvZFE7QUFBQTtBQUFBLDZCQXVlRFMsS0F2ZUMsRUF1ZU07QUFDWixZQUFJQyxZQUFZRCxNQUFNRSxLQUFOLENBQVksR0FBWixDQUFoQjs7QUFFQSxZQUFJbEYsT0FBVSxDQUFDLENBQUNpRixVQUFVLENBQVYsQ0FBRixJQUFrQkEsVUFBVSxDQUFWLE1BQWlCLEVBQXBDLEdBQTBDekIsT0FBT3lCLFVBQVUsQ0FBVixDQUFQLENBQTFDLEdBQWlFLElBQTlFO0FBQ0EsWUFBSXhCLFNBQVUsQ0FBQyxDQUFDd0IsVUFBVSxDQUFWLENBQUYsSUFBa0JBLFVBQVUsQ0FBVixNQUFpQixFQUFwQyxHQUEwQ25CLE9BQU9tQixVQUFVLENBQVYsQ0FBUCxDQUExQyxHQUFpRSxJQUE5RTtBQUNBLFlBQUl0QixNQUFVLENBQUMsQ0FBQ3NCLFVBQVUsQ0FBVixDQUFGLElBQWtCQSxVQUFVLENBQVYsTUFBaUIsRUFBcEMsR0FBMENuQixPQUFPbUIsVUFBVSxDQUFWLENBQVAsQ0FBMUMsR0FBaUUsSUFBOUU7QUFDQSxZQUFJdkIsUUFBVSxDQUFDLENBQUN1QixVQUFVLENBQVYsQ0FBRixJQUFrQkEsVUFBVSxDQUFWLE1BQWlCLEVBQXBDLEdBQTBDbkIsT0FBT21CLFVBQVUsQ0FBVixDQUFQLENBQTFDLEdBQWlFLElBQTlFO0FBQ0EsWUFBSXJGLE1BQVUsQ0FBQyxDQUFDcUYsVUFBVSxDQUFWLENBQUYsSUFBa0JBLFVBQVUsQ0FBVixNQUFpQixFQUFwQyxHQUEwQ25CLE9BQU9tQixVQUFVLENBQVYsQ0FBUCxDQUExQyxHQUFpRSxJQUE5RTs7QUFFQSxhQUFLUixPQUFMLEdBQWU7QUFDYnpFLGdCQUFRQSxJQURLO0FBRWJ5RCxrQkFBUUEsTUFGSztBQUdiRSxlQUFRQSxHQUhLO0FBSWJELGlCQUFRQSxLQUpLO0FBS2I5RCxlQUFRQTtBQUxLLFNBQWY7QUFPRDs7QUFFRDs7OztBQXpmUTtBQUFBO0FBQUEsMEJBd2JpQjtBQUN2QixlQUFPLEtBQUt5RSxtQkFBWjtBQUNEO0FBMWJPO0FBQUE7QUFBQSwyQ0E0Zm9CO0FBQzFCLFlBQUljLG9CQUFvQixJQUFJakIsWUFBSixFQUF4Qjs7QUFFQSxZQUFJa0Isa0NBQ0ZDLGlCQUFpQkMsU0FBakIsQ0FBMkJDLGFBRDdCOztBQUdBRix5QkFBaUJDLFNBQWpCLENBQTJCQyxhQUEzQixHQUEyQyxVQUFTQyxPQUFULEVBQWtCQyxJQUFsQixFQUF3QjtBQUNqRUwsMENBQWdDTSxJQUFoQyxDQUFxQyxJQUFyQyxFQUEyQ0YsT0FBM0MsRUFBb0RDLElBQXBEO0FBQ0EsY0FBSUQsWUFBWSxjQUFoQixFQUFnQztBQUM5QixvQkFBUUMsS0FBSyxDQUFMLENBQVI7QUFDRSxtQkFBSyxLQUFMO0FBQ0VOLGtDQUFrQlEsTUFBbEIsQ0FBeUJGLEtBQUssQ0FBTCxDQUF6QjtBQUNBO0FBQ0YsbUJBQUssT0FBTDtBQUNFTixrQ0FBa0JTLGNBQWxCO0FBQ0E7QUFDRixtQkFBSyxhQUFMO0FBQ0VULGtDQUFrQlUsV0FBbEIsQ0FBOEJKLEtBQUssQ0FBTCxDQUE5QjtBQUNBO0FBQ0YsbUJBQUssZUFBTDtBQUNFTixrQ0FBa0JXLGFBQWxCO0FBQ0E7QUFaSjtBQWNEO0FBQ0YsU0FsQkQ7QUFtQkQ7QUFyaEJPOztBQUFBO0FBQUE7O0FBd2hCVjVCLGVBQWE2QixrQkFBYjtBQUVELENBMWhCRCIsImZpbGUiOiJIVE5fQ3Jvc3NGYWRlQmdtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBDcm9zc0ZhZGVCZ21cbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTYgaGF0b25la29lXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbi8vIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbi8vXG4vLyAyMDE2LzA5LzEyIHZlcjAuMS4yIOOCs+ODoeODs+ODiOOBrui/veWKoOOChOOAgeODreOCsOWHuuWKm+OBruOCs+ODoeODs+ODiOOCouOCpuODiOOBquOBqVxuLy8gMjAxNi8wOS8xMSB2ZXIwLjEuMSDnhKHlkI1CR03jgpLlho3nlJ/jgZnjgovjgajjgq/jg6njg4Pjgrfjg6XjgZnjgovkuI3lhbflkIjjgavlr77lv5zjgIFmaXJzdCByZWxlYXNlXG4vLyAyMDE2LzA5LzExIHZlcjAuMS4wIOOCr+ODreOCueODleOCp+ODvOODieapn+iDveOAgeOBsuOBqOOBvuOBmuOBruWujOaIkFxuLy8gMjAxNi8wOS8xMCB2ZXIwLjAuMSDplovnmbrplovlp4tcbi8vXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyo6XG4gKiBAcGx1Z2luZGVzYyBCR03jgpLjgq/jg63jgrnjg5Xjgqfjg7zjg4lcbiAqIEBhdXRob3Ig44OP44OI44ON44Kz44KoIC0gaHR0cDovL2hhdG8tbmVrby54MC5jb21cbiAqXG4gKiBAaGVscFxuICpcbiAqIOODl+ODqeOCsOOCpOODs+OCs+ODnuODs+ODiTpcbiAqICAgQ3Jvc3NGYWRlQmdtIHNldCBiZ21fbmFtZSAgICAgICAjIOasoeOBq+a1geOBmeabsuOCkuaMh+WumuOBl+OBvuOBmVxuICogICBDcm9zc0ZhZGVCZ20gc2V0IGJnbV9uYW1lLDYwICAgICMg44Kr44Oz44Oe44Gn5Yy65YiH44KL44Go5qyh44Gr5rWB44GZ5puy44CB6Z+z6YeP44Gq44Gp44Gu5oyH5a6a44GM5Y+v6IO944Gn44GZ44CC44Kr44Oz44Oe44Gu44GC44Go44Gr44K544Oa44O844K544KS5YWl44KM44Gm44Gv44GE44GR44G+44Gb44KTXG4gKiAgIENyb3NzRmFkZUJnbSBzdGFydCAgICAgICAgICAgICAgIyDjgq/jg63jgrnjg5Xjgqfjg7zjg4njgpLplovlp4vjgZfjgb7jgZlcbiAqICAgQ3Jvc3NGYWRlQmdtIHNldER1cmF0aW9uIDguNDEgICAjIOODleOCp+ODvOODieaZgumWk+OCkuWumue+qeOBl+OBvuOBme+8iOOBk+OBruS+i+OBp+OBrzguNDHnp5LvvIlcbiAqICAgQ3Jvc3NGYWRlQmdtIHJlc2V0RHVyYXRpb24gICAgICAjIOODleOCp+ODvOODieaZgumWk+OCkuODh+ODleOCqeODq+ODiOWApOOBq+aIu+OBl+OBvuOBmVxuICpcbiAqIOOAkHNldOOCs+ODnuODs+ODieOBruips+e0sOOAkVxuICogICBDcm9zc0ZhZGVCZ20gc2V0IGJnbV9uYW1lLHZvbHVtZSxwYW4scGl0Y2ggICMgc2V044Kz44Oe44Oz44OJ44Gn44GvIDTjgaTjga7jgqrjg5fjgrfjg6fjg7PjgYzmjIflrprjgafjgY3jgb7jgZlcbiAqXG4gKiAgIDxvcHRpb25zPlxuICogICBiZ21fbmFtZTogQkdN5ZCN44Gn44GZ44CC56m655m944KS5ZCr44KT44Gn44Gv44GE44GR44G+44Gb44KT44CC56m655m95paH5a2X44KE5pel5pys6Kqe44KS5ZCr44KA44OV44Kh44Kk44Or5ZCN44KS5L2/44GG44Gu44Gv6YG/44GR44G+44GX44KH44GGXG4gKiAgIHZvbHVtZTog6Z+z6YeP44Gn44GZ44CCMCB+IDEwMOOAgeODhOOCr+ODvOODq+OBruOAjEJHTeOBrua8lOWlj+OAjeOBruODh+ODleOCqeODq+ODiOOBoOOBqCA5MFxuICogICBwYW46IOmfs+OBjOW3puWPs+OBruOBqeOBoeOCieOBq+WvhOOBo+OBpuOBhOOCi+OBi+OBp+OBmeOAgi0xMDAgfiAxMDDjgIHkuK3lv4Pjga8gMCDjgafjgZlcbiAqICAgcGl0Y2g6IOmfs+OBrumrmOOBleOBp+OBmeOAguOCueODlOODvOODieOCguWkieOCj+OBo+OBpuOBl+OBvuOBhuOCiOOBhuOBp+OBmeOAgjUwIH4gMjAwIOeoi+W6puOBq+OBl+OBvuOBl+OCh+OBhuOAguODh+ODleOCqeODq+ODiOOBryAxMDBcbiAqXG4gKiAgIDxleGFtcGxlPlxuICogICBDcm9zc0ZhZGVCZ20gc2V0IFNoaXAxLDkwLDAsMTAwICMg5L6L44GI44Gw44GT44Gu44KI44GG44Gr5oyH5a6a44Gn44GN44G+44GZ44CC44Kr44Oz44Oe44Gu44GC44Go44Gr44K544Oa44O844K544KS5YWl44KM44Gm44Gv44GE44GR44G+44Gb44KTXG4gKiAgIENyb3NzRmFkZUJnbSBzZXQgU2hpcDEsLCwxMDAgICAgIyDpgJTkuK3jga7lgKTjgpLnnIHnlaXjgZnjgovjgZPjgajjgYzlj6/og73jgafjgZnjgILjgZfjgYvjgZfjgIFCR03lkI3jgajpn7Pph4/jga/mnIDkvY7pmZDmjIflrprjgZfjgZ/mlrnjgYzjgYTjgYTjgafjgZlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIOecgeeVpeOBleOCjOOBn+mfs+mHj+OBquOBqeOBruWApOOBr+OAgeePvuWcqOa1geOCjOOBpuOCi0JHTeOBruWApOOBjOS9v+OCj+OCjOOBvuOBmVxuICpcbiAqIOazqOaEj+S6i+mghTpcbiAqICAg44OE44Kv44O844Or44Gn44Gu44CM44OH44OX44Ot44Kk44Oh44Oz44OI44CN44Gn44Ky44O844Og44KS5Ye65Yqb44GZ44KL44Go44GN44CB44CM5pyq5L2/55So44OV44Kh44Kk44Or44KS5ZCr44G+44Gq44GE44CN44Gu44OB44Kn44OD44Kv44KST07jgavjgZfjgZ/loLTlkIjjgIFcbiAqICAg44OE44Kv44O844Or44Gv44OX44Op44Kw44Kk44Oz44Kz44Oe44Oz44OJ44Gn44Gp44GuQkdN44GM5L2/44KP44KM44Gm44KL44Gu44GL44G+44Gn44Gv6KaL44G+44Gb44KT44Gu44Gn44CBXG4gKiAgIOacrOW9k+OBr+S9v+OBo+OBpuOBhOOCi+OBruOBq+OAgeS9v+OBo+OBpuOBquOBhOOBqOOBv+OBquOBleOCjOOBpuW/heimgeOBqkJHTeODleOCoeOCpOODq+OBjOWHuuWKm+OBleOCjOOBquOBhOWgtOWQiOOBjOOBguOCiuOBvuOBmeOAglxuICpcbiAqICAg44GT44KM44Gn44Gv44Gd44GuQkdN44KS5YaN55Sf44GX44KI44GG44Go44GX44Gf44Go44GN44Gr44Ko44Op44O844GM55m655Sf44GX44Gm44GX44G+44GE44G+44GZ44CCXG4gKlxuICogICDlr77nrZbjgajjgZfjgabjga/jgIHjgIzmnKrkvb/nlKjjg5XjgqHjgqTjg6vjgpLlkKvjgb7jgarjgYTjgI3jga7jg4Hjgqfjg4Pjgq/jgpJPRkbjgafjg4fjg5fjg63jgqTjg6Hjg7Pjg4jjgZnjgovjgYvjgIFcbiAqICAg44OA44Of44O844Gu77yI44Ky44O844Og44Gn44Gv5a6f6Zqb6YCa44KJ44Gq44GE77yJ44Oe44OD44OX44KS55So5oSP44GX44Gm44CB5Ye65Yqb44GV44KM44Gq44GEQkdN44KS5ryU5aWP44GZ44KL44Kk44OZ44Oz44OI44KS44Gd44GT44Gr572u44GP44Go44GE44GE44GL44Go5oCd44GE44G+44GZ44CCXG4gKlxuICogQHBhcmFtIERlZmF1bHQgRmFkZSBEdXJhdGlvbiBTZWNcbiAqIEBkZXNjIOODh+ODleOCqeODq+ODiOOBruODleOCp+ODvOODieaZgumWk++8iOenku+8iVxuICogQGRlZmF1bHQgMS4yMFxuICpcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBwbHVnaW5OYW1lID0gXCJIVE5fQ3Jvc3NGYWRlQmdtXCI7XG5cbiAgLyoqXG4gICAqIGJnbSDjga8gQXJyYXkg44Kv44Op44K5XG4gICAqIGJ1ZmZlciDjga8gV2ViQXVkaW8g44Kv44Op44K544CB44KC44GX44GP44GvIEh0bWw1QXVkaW8g44Kv44Op44K5XG4gICAqL1xuICBjbGFzcyBCZ21CdWZmZXIge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICBCZ21CdWZmZXIuZXh0ZW5kQXVkaW9NYW5hZ2VyKCk7XG4gICAgICBCZ21CdWZmZXIuc2V0SW5kZXhGb3JDdXJyZW50QmdtKDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODhOOCr+ODvOODq+OBriBBdWRpb01hbmFnZXIg44Kv44Op44K544KS5ouh5by1XG4gICAgICpcbiAgICAgKiBARklYTUUg5LuW44Gu44OX44Op44Kw44Kk44Oz44GMIHBsYXlCZ20oKSDjgajjgYvmi6HlvLXjgZnjgovjgajjgZPjga7jg5fjg6njgrDjgqTjg7PjgYzli5XjgYvjgarjgY/jgarjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgZXh0ZW5kQXVkaW9NYW5hZ2VyKCkge1xuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheSA9IFtdO1xuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheSA9IFtdO1xuXG4gICAgICAvKiogQkdNIOOBruWGjeeUnyAqL1xuICAgICAgQXVkaW9NYW5hZ2VyLnBsYXlCZ20gPSBmdW5jdGlvbihiZ20sIHBvcykge1xuICAgICAgICBpZiAoQXVkaW9NYW5hZ2VyLmlzQ3VycmVudEJnbShiZ20pKSB7XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLnVwZGF0ZUJnbVBhcmFtZXRlcnMoYmdtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBBdWRpb01hbmFnZXIuc3RvcEJnbSgpO1xuICAgICAgICAgIGlmIChiZ20ubmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYoRGVjcnlwdGVyLmhhc0VuY3J5cHRlZEF1ZGlvICYmIEF1ZGlvTWFuYWdlci5zaG91bGRVc2VIdG1sNUF1ZGlvKCkpe1xuICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheUVuY3J5cHRlZEJnbShiZ20sIHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgYmdtLnBvcyA9IHBvcztcbiAgICAgICAgICAgICAgQmdtQnVmZmVyLnB1c2hCdWZmZXIoYmdtKTtcbiAgICAgICAgICAgICAgLy8gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXIgPSBBdWRpb01hbmFnZXIuY3JlYXRlQnVmZmVyKCdiZ20nLCBiZ20ubmFtZSk7XG4gICAgICAgICAgICAgIEF1ZGlvTWFuYWdlci51cGRhdGVCZ21QYXJhbWV0ZXJzKGJnbSk7XG4gICAgICAgICAgICAgIGlmICghQXVkaW9NYW5hZ2VyLl9tZUJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIC8vIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyLnBsYXkodHJ1ZSwgcG9zIHx8IDApO1xuICAgICAgICAgICAgICAgIEJnbUJ1ZmZlci5wbGF5QWxsQnVmZmVycygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEF1ZGlvTWFuYWdlci51cGRhdGVDdXJyZW50QmdtKGJnbSwgcG9zKTtcbiAgICAgIH07XG5cbiAgICAgIC8qKiBwbGF5RW5jcnlwdGVkQmdtIOOBi+OCieWRvOOBsOOCjOOCi+OAguaal+WPt+WMluOBleOCjOOBn0JHTeOCkuWGjeeUn+OBmeOCi+OBn+OCgeOBruODkOODg+ODleOCoeOCkuS9nOaIkCAqL1xuICAgICAgQXVkaW9NYW5hZ2VyLmNyZWF0ZURlY3J5cHRCdWZmZXIgPSBmdW5jdGlvbih1cmwsIGJnbSwgcG9zKXtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9ibG9iVXJsID0gdXJsO1xuICAgICAgICBiZ20ucG9zID0gcG9zO1xuICAgICAgICBCZ21CdWZmZXIucHVzaEJ1ZmZlcihiZ20pO1xuICAgICAgICAvLyBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5jcmVhdGVCdWZmZXIoJ2JnbScsIGJnbS5uYW1lKTtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLnVwZGF0ZUJnbVBhcmFtZXRlcnMoYmdtKTtcbiAgICAgICAgaWYgKCFBdWRpb01hbmFnZXIuX21lQnVmZmVyKSB7XG4gICAgICAgICAgLy8gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXIucGxheSh0cnVlLCBwb3MgfHwgMCk7XG4gICAgICAgICAgQmdtQnVmZmVyLnBsYXlBbGxCdWZmZXJzKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXVkaW9NYW5hZ2VyLnVwZGF0ZUN1cnJlbnRCZ20oYmdtLCBwb3MpO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBCR00g44Gu5YaN55Sf5YGc5q2iXG4gICAgICAgKiDjg5Djg4Pjg5XjgqHjg7zphY3liJfjga/nqbrjgavjgZnjgotcbiAgICAgICAqL1xuICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BCZ20gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgYnVmZmVyLnN0b3AoKTtcbiAgICAgICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQmdtQnVmZmVyLnNldEluZGV4Rm9yQ3VycmVudEJnbSgwKTtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheSA9IFtdO1xuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5ID0gW107XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIF9iZ21CdWZmZXIg44GvIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkg44GL44KJ6Kqt44G/5Y+W44KLXG4gICAgICogX2N1cnJlbnRCZ20g44GvIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXkg44GL44KJ6Kqt44G/5Y+W44KLXG4gICAgICog44GT44GT44Gn44Gv44CB44Gd44GuIF9iZ21CdWZmZXIsIF9jdXJyZW50QmdtIOOBruabuOOBjei+vOOBv+ODu+iqreOBv+i+vOOBv+OBruWvvuixoeOBqOOBquOCi+mFjeWIl+OBrmluZGV4KDB+KeOCkuaMh+WumuOBmeOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleEZvckN1cnJlbnRCZ206IE51bWJlciBfYmdtQnVmZmVyLCBfY3VycmVudEJnbSDjga7lr77osaHjgajjgarjgovphY3liJfjga5pbmRleCgwfilcbiAgICAgKi9cbiAgICBzdGF0aWMgc2V0SW5kZXhGb3JDdXJyZW50QmdtKF9pbmRleEZvckN1cnJlbnRCZ20pIHtcbiAgICAgIHZhciBpbmRleEZvckN1cnJlbnRCZ20gPSBwYXJzZUludChfaW5kZXhGb3JDdXJyZW50QmdtKTtcbiAgICAgIHZhciBsZW5ndGggPSBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCk7XG5cbiAgICAgIGlmKGluZGV4Rm9yQ3VycmVudEJnbSA9PT0gMCB8fCAoMCA8PSBpbmRleEZvckN1cnJlbnRCZ20gJiYgaW5kZXhGb3JDdXJyZW50QmdtIDwgbGVuZ3RoKSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXVkaW9NYW5hZ2VyLCAnX2JnbUJ1ZmZlcicsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhGb3JDdXJyZW50QmdtXTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24oX2J1ZmZlcikge1xuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpbmRleEZvckN1cnJlbnRCZ21dID0gX2J1ZmZlcjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXVkaW9NYW5hZ2VyLCAnX2N1cnJlbnRCZ20nLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBBdWRpb01hbmFnZXIuX2JnbUFycmF5W2luZGV4Rm9yQ3VycmVudEJnbV07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKF9iZ20pIHtcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhGb3JDdXJyZW50QmdtXSA9IF9iZ207XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXCIhIVdBUk4hISBpbmRleCBudW1iZXIgaXMgbm90IHZhbGlkIEAgc2V0SW5kZXhGb3JDdXJyZW50QmdtXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODkOODg+ODleOCoeODvOOCkuW+jOOCjeOBq+i2s+OBmVxuICAgICAqXG4gICAgICogQHBhcmFtIF9uZXdCZ206IEFycmF5IOS+iyB7bmFtZTogXCJiZ21fdGl0bGVcIiwgdm9sdW1lOiA5MCwgcGl0Y2g6IDEwMCwgcGFuOiAwLCBwb3M6IDB9XG4gICAgICovXG4gICAgc3RhdGljIHB1c2hCdWZmZXIoX25ld0JnbSkge1xuICAgICAgLy8g5pyq5a6a576p44Gu6YOo5YiG44Gv54++5Zyo44Gu5puy44Gu5YCk44KS44K744OD44OI44GX44Gm44GC44GS44KLXG4gICAgICB2YXIgbmV3QmdtID0gQmdtQnVmZmVyLmFycmFuZ2VOZXdCZ20oX25ld0JnbSwgQXVkaW9NYW5hZ2VyLl9jdXJyZW50QmdtKTtcblxuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheS5wdXNoKG5ld0JnbSk7XG5cbiAgICAgIC8vIOeEoeWQjUJHTeOCguabsuOBqOOBl+OBpuaJseOBhuOBjOOAgeODkOODg+ODleOCoeODvOOBqOOBl+OBpuOBr251bGxcbiAgICAgIGlmKG5ld0JnbS5uYW1lID09PSBcIlwiKSB7XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkucHVzaChudWxsKTtcbiAgICAgIH0gZWxzZSBpZihuZXdCZ20ubmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyDmmpflj7fljJbjgZXjgozjgZ/jgqrjg7zjg4fjgqPjgqrjg5XjgqHjgqTjg6vjga7loLTlkIggQFRPRE8g6YCa44KJ44Gq44GE44Gj44G944GE44Gu44Gn5raI44GX44Gm44KC44GE44GE44GL44KCXG4gICAgICAgIGlmKERlY3J5cHRlci5oYXNFbmNyeXB0ZWRBdWRpbyAmJiBBdWRpb01hbmFnZXIuc2hvdWxkVXNlSHRtbDVBdWRpbygpKXtcbiAgICAgICAgICB2YXIgZXh0ID0gQXVkaW9NYW5hZ2VyLmF1ZGlvRmlsZUV4dCgpO1xuICAgICAgICAgIHZhciB1cmwgPSBBdWRpb01hbmFnZXIuX3BhdGggKyAnYmdtLycgKyBlbmNvZGVVUklDb21wb25lbnQoYmdtLm5hbWUpICsgZXh0O1xuICAgICAgICAgIHVybCA9IERlY3J5cHRlci5leHRUb0VuY3J5cHRFeHQodXJsKTtcbiAgICAgICAgICBEZWNyeXB0ZXIuZGVjcnlwdEhUTUw1QXVkaW8odXJsLCBiZ20sIGJnbS5wb3MpO1xuICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmxvYlVybCA9IHVybDtcbiAgICAgICAgfVxuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LnB1c2goQXVkaW9NYW5hZ2VyLmNyZWF0ZUJ1ZmZlcignYmdtJywgbmV3QmdtLm5hbWUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIiEhV0FSTiEhIG5leHQgYmdtIG5hbWUgaXMgbnVsbCBAIHB1c2hCdWZmZXJcIik7XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkucHVzaChudWxsKTsgLy8gX2JnbUFycmF5IOOBruWAi+aVsOOBqOaVtOWQiOaAp+OCkuS/neOBpOOBn+OCgeaMv+WFpVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coXCJCdWZmZXLjga7lgIvmlbA6IFwiICsgQmdtQnVmZmVyLmNvdW50QnVmZmVycygpKTsgLy8gQFRPRE86IOOBguOBqOOBp+a2iOOBmVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODkOODg+ODleOCoeODvOOCkuWFiOmgreOBq+i2s+OBmVxuICAgICAqXG4gICAgICogQHBhcmFtIF9uZXdCZ206IEFycmF5IOS+iyB7bmFtZTogXCJiZ21fdGl0bGVcIiwgdm9sdW1lOiA5MCwgcGl0Y2g6IDEwMCwgcGFuOiAwLCBwb3M6IDB9XG4gICAgICovXG4gICAgc3RhdGljIHVuc2hpZnRCdWZmZXIoX25ld0JnbSkge1xuICAgICAgLy8g5pyq5a6a576p44Gu6YOo5YiG44Gv54++5Zyo44Gu5puy44Gu5YCk44KS44K744OD44OI44GX44Gm44GC44GS44KLXG4gICAgICB2YXIgbmV3QmdtID0gQmdtQnVmZmVyLmFycmFuZ2VOZXdCZ20oX25ld0JnbSwgQXVkaW9NYW5hZ2VyLl9jdXJyZW50QmdtKTtcblxuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheS51bnNoaWZ0KG5ld0JnbSk7XG5cbiAgICAgIC8vIOeEoeWQjUJHTeOCguabsuOBqOOBl+OBpuaJseOBhuOBjOOAgeODkOODg+ODleOCoeODvOOBqOOBl+OBpuOBr251bGxcbiAgICAgIGlmKG5ld0JnbS5uYW1lID09PSBcIlwiKSB7XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkudW5zaGlmdChudWxsKTtcbiAgICAgIH0gZWxzZSBpZihuZXdCZ20ubmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyDmmpflj7fljJbjgZXjgozjgZ/jgqrjg7zjg4fjgqPjgqrjg5XjgqHjgqTjg6vjga7loLTlkIggQFRPRE8g6YCa44KJ44Gq44GE44Gj44G944GE44Gu44Gn5raI44GX44Gm44KC44GE44GE44GL44KCXG4gICAgICAgIGlmKERlY3J5cHRlci5oYXNFbmNyeXB0ZWRBdWRpbyAmJiBBdWRpb01hbmFnZXIuc2hvdWxkVXNlSHRtbDVBdWRpbygpKXtcbiAgICAgICAgICB2YXIgZXh0ID0gQXVkaW9NYW5hZ2VyLmF1ZGlvRmlsZUV4dCgpO1xuICAgICAgICAgIHZhciB1cmwgPSBBdWRpb01hbmFnZXIuX3BhdGggKyAnYmdtLycgKyBlbmNvZGVVUklDb21wb25lbnQoYmdtLm5hbWUpICsgZXh0O1xuICAgICAgICAgIHVybCA9IERlY3J5cHRlci5leHRUb0VuY3J5cHRFeHQodXJsKTtcbiAgICAgICAgICBEZWNyeXB0ZXIuZGVjcnlwdEhUTUw1QXVkaW8odXJsLCBiZ20sIGJnbS5wb3MpO1xuICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmxvYlVybCA9IHVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkudW5zaGlmdChBdWRpb01hbmFnZXIuY3JlYXRlQnVmZmVyKCdiZ20nLCBuZXdCZ20ubmFtZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgbmV4dCBiZ20gbmFtZSBpcyBudWxsIEAgdW5zaGlmdEJ1ZmZlclwiKTtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS51bnNoaWZ0KG51bGwpOyAvLyBfYmdtQXJyYXkg44Gu5YCL5pWw44Go5pW05ZCI5oCn44KS5L+d44Gk44Gf44KB5oy/5YWlXG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhcIkJ1ZmZlcuOBruWAi+aVsDogXCIgKyBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCkpOyAvLyBAVE9ETzog44GC44Go44Gn5raI44GZXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OQ44OD44OV44Kh44O844Gu5YCL5pWw44KS5pWw44GI44KLXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIE51bWJlclxuICAgICAqL1xuICAgIHN0YXRpYyBjb3VudEJ1ZmZlcnMoKSB7XG4gICAgICByZXR1cm4gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44GZ44G544Gm44Gu44OQ44OD44OV44Kh44O844Gu5YaN55Sf44KS5q2i44KB44KLXG4gICAgICovXG4gICAgc3RhdGljIG11dGVBbGxCdWZmZXJzKCkge1xuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICBpZihidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICBidWZmZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgZnjgbnjgabjga7jg5Djg4Pjg5XjgqHjg7zjgpLlho3nlJ/jgZnjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgcGxheUFsbEJ1ZmZlcnMoKSB7XG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LmZvckVhY2goZnVuY3Rpb24oYnVmZmVyLCBpbmRleCkge1xuICAgICAgICBpZihidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICB2YXIgYXVkaW9QYXJhbWV0ZXIgPSBBdWRpb01hbmFnZXIuX2JnbUFycmF5W2luZGV4XTtcblxuICAgICAgICAgIGlmKGF1ZGlvUGFyYW1ldGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBBdWRpb01hbmFnZXIudXBkYXRlQnVmZmVyUGFyYW1ldGVycyhidWZmZXIsIEF1ZGlvTWFuYWdlci5fYmdtVm9sdW1lLCBhdWRpb1BhcmFtZXRlcik7XG4gICAgICAgICAgICBidWZmZXIucGxheSh0cnVlLCBhdWRpb1BhcmFtZXRlci5wb3MgfHwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRleCgwfinjgpLmjIflrprjgZfjgIHlr77osaHjga7jg5Djg4Pjg5XjgqHjg7zjgpLlho3nlJ/jgZnjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBfaW5kZXg6IE51bWJlciDlr77osaHjg5Djg4Pjg5XjgqHjg7zjga7jgIHjg5Djg4Pjg5XjgqHjg7zphY3liJfjgavjgYrjgZHjgovjgqTjg7Pjg4fjg4Pjgq/jgrkoMH4pXG4gICAgICovXG4gICAgc3RhdGljIHBsYXlCdWZmZXJCeUluZGV4KF9pbmRleCkge1xuICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoX2luZGV4KTtcbiAgICAgIHZhciBsZW5ndGggPSBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCk7XG5cbiAgICAgIGlmKDAgPD0gaW5kZXggJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhdO1xuXG4gICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHZhciBhdWRpb1BhcmFtZXRlciA9IEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdO1xuXG4gICAgICAgICAgaWYoYXVkaW9QYXJhbWV0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci51cGRhdGVCdWZmZXJQYXJhbWV0ZXJzKGJ1ZmZlciwgQXVkaW9NYW5hZ2VyLl9iZ21Wb2x1bWUsIGF1ZGlvUGFyYW1ldGVyKTtcbiAgICAgICAgICAgIGJ1ZmZlci5wbGF5KHRydWUsIGF1ZGlvUGFyYW1ldGVyLnBvcyB8fCAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIiEhV0FSTiEhIGluZGV4IG51bWJlciBpcyBub3QgdmFsaWQgQCBwbGF5QnVmZmVyQnlJbmRleFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg5Djg4Pjg5XjgqHjg7zjgpLmjIflrprlgIvmlbDjgavmuJvjgonjgZlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBxdWFudGl0eTogTnVtYmVyIOOBk+OBruaVsOOBqyBidWZmZXIg44Gu5YCL5pWw44KS5rib44KJ44GZXG4gICAgICovXG4gICAgc3RhdGljIHJlZHVjZUJ1ZmZlcnMoX3F1YW50aXR5KSB7XG4gICAgICB2YXIgcXVhbnRpdHkgPSBwYXJzZUludChfcXVhbnRpdHkpO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgZm9yKHZhciBpID0gcXVhbnRpdHk7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICBpZihBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2ldICE9PSBudWxsKSB7XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpXS5zdG9wKCk7XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXkgPSBBdWRpb01hbmFnZXIuX2JnbUFycmF5LnNsaWNlKDAsIHF1YW50aXR5KTtcbiAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkgPSBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LnNsaWNlKDAsIHF1YW50aXR5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRleCgwfinjgpLmjIflrprjgZfjgIHlr77osaHjga7jg5Djg4Pjg5XjgqHjg7zjgpLliYrpmaTjgZnjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBfaW5kZXg6IE51bWJlciDlr77osaHjg5Djg4Pjg5XjgqHjg7zjga7jgIHjg5Djg4Pjg5XjgqHjg7zphY3liJfjgavjgYrjgZHjgovjgqTjg7Pjg4fjg4Pjgq/jgrkoMH4pXG4gICAgICovXG4gICAgc3RhdGljIHJlbW92ZUJ1ZmZlckJ5SW5kZXgoX2luZGV4KSB7XG4gICAgICB2YXIgaW5kZXggPSBwYXJzZUludChfaW5kZXgpO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgdmFyIG5ld0JnbUFycmF5ID0gW107XG4gICAgICB2YXIgbmV3QmdtQnVmZmVyQXJyYXkgPSBbXTtcblxuICAgICAgaWYoMCA8PSBpbmRleCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBpZihpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgbmV3QmdtQXJyYXkucHVzaChBdWRpb01hbmFnZXIuX2JnbUFycmF5W2ldKTtcbiAgICAgICAgICAgIG5ld0JnbUJ1ZmZlckFycmF5LnB1c2goQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaV0uc3RvcCgpO1xuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpXSA9IG51bGw7XG4gICAgICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5W2ldID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5ID0gbmV3QmdtQXJyYXk7XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkgPSBuZXdCZ21CdWZmZXJBcnJheTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIiEhV0FSTiEhIGluZGV4IG51bWJlciBpcyBub3QgdmFsaWQgQCByZW1vdmVCdWZmZXJCeUluZGV4XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGV4KDB+KeOCkuaMh+WumuOBl+OAgeWvvuixoeOBruODkOODg+ODleOCoeODvOOCkuOCouODg+ODl+ODh+ODvOODiFxuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleDogTnVtYmVyIOOCouODg+ODl+ODh+ODvOODiOWvvuixoeOBqOOBmeOCi+ODkOODg+ODleOCoeODvOOBruOAgeODkOODg+ODleOCoeODvOmFjeWIl+OBq+OBiuOBkeOCi+OCpOODs+ODh+ODg+OCr+OCuSgwfilcbiAgICAgKiBAcGFyYW0gX25ld0JnbTogQXJyYXkg5L6LIHtuYW1lOiBcImJnbV90aXRsZVwiLCB2b2x1bWU6IDkwLCBwaXRjaDogMTAwLCBwYW46IDAsIHBvczogMH1cbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlQnVmZmVyQnlJbmRleChfaW5kZXgsIF9uZXdCZ20pIHtcbiAgICAgIHZhciBpbmRleCA9IHBhcnNlSW50KF9pbmRleCk7XG4gICAgICB2YXIgbGVuZ3RoID0gQmdtQnVmZmVyLmNvdW50QnVmZmVycygpO1xuXG4gICAgICBpZigwIDw9IGluZGV4ICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2luZGV4XTtcbiAgICAgICAgdmFyIGN1cnJlbnRCZ20gPSBBdWRpb01hbmFnZXIuX2JnbUFycmF5W2luZGV4XTtcbiAgICAgICAgdmFyIG5ld0JnbSA9IEJnbUJ1ZmZlci5hcnJhbmdlTmV3QmdtKF9uZXdCZ20sIGN1cnJlbnRCZ20pO1xuXG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdID0gbmV3QmdtO1xuICAgICAgICBBdWRpb01hbmFnZXIudXBkYXRlQnVmZmVyUGFyYW1ldGVycyhidWZmZXIsIEF1ZGlvTWFuYWdlci5fYmdtVm9sdW1lLCBuZXdCZ20pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIHVwZGF0ZUJ1ZmZlckJ5SW5kZXhcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQkdN5ZCN44KS44KC44Go44Gr44OQ44OD44OV44Kh44O85LiA6Kan44KS5qSc57Si44GX44CB5a++6LGh44Gu44OQ44OD44OV44Kh44O844KS44Ki44OD44OX44OH44O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX2JnbU5hbWU6IFN0cmluZyDmm7TmlrDjgZfjgZ/jgYQgQkdN5ZCNXG4gICAgICogQHBhcmFtIF9uZXdCZ206IEFycmF5IOS+iyB7bmFtZTogXCJiZ21fdGl0bGVcIiwgdm9sdW1lOiA5MCwgcGl0Y2g6IDEwMCwgcGFuOiAwLCBwb3M6IDB9XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZUJ1ZmZlckJ5QmdtTmFtZShfYmdtTmFtZSwgX25ld0JnbSkge1xuICAgICAgdmFyIGJnbU5hbWUgPSBTdHJpbmcoX2JnbU5hbWUpO1xuXG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5LmZvckVhY2goZnVuY3Rpb24oYmdtLCBpbmRleCkge1xuICAgICAgICBpZihiZ20ubmFtZSA9PT0gYmdtTmFtZSkge1xuICAgICAgICAgIHZhciBidWZmZXIgPSBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2luZGV4XTtcbiAgICAgICAgICB2YXIgY3VycmVudEJnbSA9IEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdO1xuICAgICAgICAgIHZhciBuZXdCZ20gPSBCZ21CdWZmZXIuYXJyYW5nZU5ld0JnbShfbmV3QmdtLCBjdXJyZW50QmdtKTtcblxuICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdID0gbmV3QmdtO1xuICAgICAgICAgIEF1ZGlvTWFuYWdlci51cGRhdGVCdWZmZXJQYXJhbWV0ZXJzKGJ1ZmZlciwgQXVkaW9NYW5hZ2VyLl9iZ21Wb2x1bWUsIG5ld0JnbSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOacquWumue+qeOBruWApOOBryBjdXJyZW50QmdtIOOBruWApOOCkuS9v+OBhuOCiOOBhuiqv+aVtFxuICAgICAqXG4gICAgICogQHBhcmFtIF9uZXdCZ206IEFycmF5IOaWsOOBl+OBhCBCR01cbiAgICAgKiBAcGFyYW0gX2N1cnJlbnRCZ206IEFycmF5IOePvuWcqOOBriBCR01cbiAgICAgKiBAcmV0dXJuIG5ld0JnbTogQXJyYXkg6Kq/5pW044GV44KM44Gf5paw44GX44GEIEJHTVxuICAgICAqL1xuICAgIHN0YXRpYyBhcnJhbmdlTmV3QmdtKF9uZXdCZ20sIF9jdXJyZW50QmdtKSB7XG4gICAgICB2YXIgbmV3QmdtID0gX25ld0JnbTtcblxuICAgICAgaWYobmV3QmdtLm5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgbmV3QmdtLm5hbWUgPSBfY3VycmVudEJnbS5uYW1lO1xuICAgICAgfVxuICAgICAgaWYobmV3QmdtLnZvbHVtZSA9PT0gbnVsbCkge1xuICAgICAgICBuZXdCZ20udm9sdW1lID0gX2N1cnJlbnRCZ20gPyBfY3VycmVudEJnbS52b2x1bWUgOiA5MDtcbiAgICAgIH1cbiAgICAgIGlmKG5ld0JnbS5waXRjaCA9PT0gbnVsbCkge1xuICAgICAgICBuZXdCZ20ucGl0Y2ggPSBfY3VycmVudEJnbSA/IF9jdXJyZW50QmdtLnBpdGNoIDogMTAwO1xuICAgICAgfVxuICAgICAgaWYobmV3QmdtLnBhbiA9PT0gbnVsbCkge1xuICAgICAgICBuZXdCZ20ucGFuID0gX2N1cnJlbnRCZ20gPyBfY3VycmVudEJnbS5wYW4gOiAwO1xuICAgICAgfVxuICAgICAgaWYobmV3QmdtLnBvcyA9PT0gbnVsbCkge1xuICAgICAgICBuZXdCZ20ucG9zID0gX2N1cnJlbnRCZ20gPyBfY3VycmVudEJnbS5wb3MgOiAwO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3QmdtO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGV4KDB+KeOCkuaMh+WumuOBl+OAgeWvvuixoeOBruODkOODg+ODleOCoeODvOOCkuODleOCp+ODvOODieOCpOODs1xuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleDogTnVtYmVyIOOCouODg+ODl+ODh+ODvOODiOWvvuixoeOBqOOBmeOCi+ODkOODg+ODleOCoeODvOOBruOAgeODkOODg+ODleOCoeODvOmFjeWIl+OBq+OBiuOBkeOCi+OCpOODs+ODh+ODg+OCr+OCuSgwfilcbiAgICAgKiBAcGFyYW0gX2ZhZGVEdXJhdGlvblNlYzogTnVtYmVyIOODleOCp+ODvOODieOCpOODs+OBq+OBi+OBkeOCi+aZgumWk++8iOenku+8iVxuICAgICAqL1xuICAgIHN0YXRpYyBmYWRlSW5CdWZmZXJCeUluZGV4KF9pbmRleCwgX2ZhZGVEdXJhdGlvblNlYykge1xuICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoX2luZGV4KTtcbiAgICAgIHZhciBmYWRlRHVyYXRpb25TZWMgPSBOdW1iZXIoX2ZhZGVEdXJhdGlvblNlYyk7XG4gICAgICB2YXIgbGVuZ3RoID0gQmdtQnVmZmVyLmNvdW50QnVmZmVycygpO1xuXG4gICAgICBpZigwIDw9IGluZGV4ICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2luZGV4XTtcblxuICAgICAgICBpZihidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICBidWZmZXIuZmFkZUluKGZhZGVEdXJhdGlvblNlYyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIiEhV0FSTiEhIGluZGV4IG51bWJlciBpcyBub3QgdmFsaWQgQCBmYWRlSW5CdWZmZXJCeUluZGV4XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGV4KDB+KeOCkuaMh+WumuOBl+OAgeWvvuixoeOBruODkOODg+ODleOCoeODvOOCkuODleOCp+ODvOODieOCouOCpuODiFxuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleDogTnVtYmVyIOOCouODg+ODl+ODh+ODvOODiOWvvuixoeOBqOOBmeOCi+ODkOODg+ODleOCoeODvOOBruOAgeODkOODg+ODleOCoeODvOmFjeWIl+OBq+OBiuOBkeOCi+OCpOODs+ODh+ODg+OCr+OCuSgwfilcbiAgICAgKiBAcGFyYW0gX2ZhZGVEdXJhdGlvblNlYzogTnVtYmVyIOODleOCp+ODvOODieOCouOCpuODiOOBq+OBi+OBkeOCi+aZgumWk++8iOenku+8iVxuICAgICAqL1xuICAgIHN0YXRpYyBmYWRlT3V0QnVmZmVyQnlJbmRleChfaW5kZXgsIF9mYWRlRHVyYXRpb25TZWMpIHtcbiAgICAgIHZhciBpbmRleCA9IHBhcnNlSW50KF9pbmRleCk7XG4gICAgICB2YXIgZmFkZUR1cmF0aW9uU2VjID0gTnVtYmVyKF9mYWRlRHVyYXRpb25TZWMpO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgaWYoMCA8PSBpbmRleCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgYnVmZmVyID0gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpbmRleF07XG5cbiAgICAgICAgaWYoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgYnVmZmVyLmZhZGVPdXQoZmFkZUR1cmF0aW9uU2VjKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIGZhZGVPdXRCdWZmZXJCeUluZGV4XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBnZXRCdWZmZXJzUG9zaXRpb25CeUluZGV4KF9pbmRleCkge1xuICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoX2luZGV4KTtcbiAgICAgIHZhciBsZW5ndGggPSBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCk7XG5cbiAgICAgIGlmKDAgPD0gaW5kZXggJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhdO1xuXG4gICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiAoYnVmZmVyLnNlZWsoKSB8fCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIGZhZGVJbkJ1ZmZlckJ5SW5kZXhcIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2xhc3MgQ3Jvc3NGYWRlQmdtIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgIC8vIOODl+ODqeOCsOOCpOODs+ODkeODqeODoeODvOOCv+ODvOOBi+OCieODh+ODleOCqeODq+ODiOODleOCp+ODvOODieaZgumWk+OCkuioreWumlxuICAgICAgdmFyIHBhcmFtZXRlcnMgPSBQbHVnaW5NYW5hZ2VyLnBhcmFtZXRlcnMocGx1Z2luTmFtZSk7XG4gICAgICB0aGlzLl9kZWZhdWx0RHVyYXRpb25TZWMgPSBOdW1iZXIocGFyYW1ldGVyc1tcIkRlZmF1bHQgRmFkZSBEdXJhdGlvbiBTZWNcIl0pO1xuICAgICAgdGhpcy5kdXJhdGlvblNlYyA9IHRoaXMuZGVmYXVsdER1cmF0aW9uU2VjO1xuXG4gICAgICB0aGlzLmJnbUJ1ZmZlciA9IG5ldyBCZ21CdWZmZXIoKTtcblxuICAgICAgdGhpcy5uZXh0QmdtID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiogZGVmYXVsdER1cmF0aW9uU2VjIOOCkuWPluW+l+OAgXNldCDjga/jgZfjgarjgYQgKi9cbiAgICBnZXQgZGVmYXVsdER1cmF0aW9uU2VjKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RlZmF1bHREdXJhdGlvblNlYztcbiAgICB9XG5cbiAgICAvKiog44Kv44Ot44K544OV44Kn44O844OJ44KS6ZaL5aeLICovXG4gICAgc3RhcnRDcm9zc0ZhZGUoKSB7XG4gICAgICBpZihBdWRpb01hbmFnZXIuX2N1cnJlbnRCZ20gIT09IG51bGwpIHtcbiAgICAgICAgaWYodGhpcy5uZXh0QmdtLm5hbWUgIT09IEF1ZGlvTWFuYWdlci5fY3VycmVudEJnbS5uYW1lKSB7XG4gICAgICAgICAgdGhpcy5uZXh0QmdtID0gQmdtQnVmZmVyLmFycmFuZ2VOZXdCZ20odGhpcy5uZXh0QmdtLCBBdWRpb01hbmFnZXIuX2N1cnJlbnRCZ20pO1xuXG4gICAgICAgICAgdmFyIHBvc2l0aW9uID0gQmdtQnVmZmVyLmdldEJ1ZmZlcnNQb3NpdGlvbkJ5SW5kZXgoMCk7XG4gICAgICAgICAgdGhpcy5uZXh0QmdtLnBvcyA9IHBvc2l0aW9uO1xuICAgICAgICAgIEF1ZGlvTWFuYWdlci5fY3VycmVudEJnbS5wb3MgPSBwb3NpdGlvbjtcblxuICAgICAgICAgIEJnbUJ1ZmZlci51bnNoaWZ0QnVmZmVyKHRoaXMubmV4dEJnbSk7XG4gICAgICAgICAgQmdtQnVmZmVyLnJlZHVjZUJ1ZmZlcnMoMik7XG4gICAgICAgICAgQmdtQnVmZmVyLnBsYXlBbGxCdWZmZXJzKCk7XG5cbiAgICAgICAgICBCZ21CdWZmZXIuZmFkZUluQnVmZmVyQnlJbmRleCgwLCB0aGlzLmR1cmF0aW9uU2VjICogMC43NSk7XG4gICAgICAgICAgQmdtQnVmZmVyLmZhZGVPdXRCdWZmZXJCeUluZGV4KDEsIHRoaXMuZHVyYXRpb25TZWMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBCZ21CdWZmZXIudW5zaGlmdEJ1ZmZlcih0aGlzLm5leHRCZ20pO1xuICAgICAgICBCZ21CdWZmZXIucmVkdWNlQnVmZmVycygyKTtcbiAgICAgICAgQmdtQnVmZmVyLnBsYXlBbGxCdWZmZXJzKCk7XG4gICAgICAgIEJnbUJ1ZmZlci5mYWRlSW5CdWZmZXJCeUluZGV4KDAsIHRoaXMuZHVyYXRpb25TZWMgKiAwLjc1KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiog44OV44Kn44O844OJ5pmC6ZaTKHMp44KS6Kit5a6aICovXG4gICAgc2V0RHVyYXRpb24oZHVyYXRpb25TZWMpIHtcbiAgICAgIHRoaXMuZHVyYXRpb25TZWMgPSBOdW1iZXIoZHVyYXRpb25TZWMpO1xuICAgIH1cblxuICAgIC8qKiDjg5Xjgqfjg7zjg4nmmYLplpMocynjgpLjg4fjg5Xjgqnjg6vjg4jjgavjg6rjgrvjg4Pjg4ggKi9cbiAgICByZXNldER1cmF0aW9uKCkge1xuICAgICAgdGhpcy5kdXJhdGlvblNlYyA9IHRoaXMuZGVmYXVsdER1cmF0aW9uU2VjO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOasoeOBq+a1geOBmUJHTeOCkuOBvuOBqOOCgeOBpuioreWumlxuICAgICAqXG4gICAgICogbmFtZSx2b2x1bWUscGFuLHBpdGNoLHBvcyDjga7poIbjgafjgb7jgajjgoHjgabmm7jjgY9cbiAgICAgKiDjgqvjg7Pjg57jga7jgYLjgajjgavnqbrnmb3mloflrZfjgpLnva7jgYvjgarjgYTjgZPjgahcbiAgICAgKlxuICAgICAqIEBwYXJhbSBfYXJnczogU3RyaW5nXG4gICAgICovXG4gICAgc2V0QWxsKF9hcmdzKSB7XG4gICAgICB2YXIgYXJnc0FycmF5ID0gX2FyZ3Muc3BsaXQoXCIsXCIpO1xuXG4gICAgICB2YXIgbmFtZSAgID0gKCEhYXJnc0FycmF5WzBdICYmIGFyZ3NBcnJheVswXSAhPT0gXCJcIikgPyBTdHJpbmcoYXJnc0FycmF5WzBdKSA6IG51bGw7XG4gICAgICB2YXIgdm9sdW1lID0gKCEhYXJnc0FycmF5WzFdICYmIGFyZ3NBcnJheVsxXSAhPT0gXCJcIikgPyBOdW1iZXIoYXJnc0FycmF5WzFdKSA6IG51bGw7XG4gICAgICB2YXIgcGFuICAgID0gKCEhYXJnc0FycmF5WzJdICYmIGFyZ3NBcnJheVsyXSAhPT0gXCJcIikgPyBOdW1iZXIoYXJnc0FycmF5WzJdKSA6IG51bGw7XG4gICAgICB2YXIgcGl0Y2ggID0gKCEhYXJnc0FycmF5WzNdICYmIGFyZ3NBcnJheVszXSAhPT0gXCJcIikgPyBOdW1iZXIoYXJnc0FycmF5WzNdKSA6IG51bGw7XG4gICAgICB2YXIgcG9zICAgID0gKCEhYXJnc0FycmF5WzRdICYmIGFyZ3NBcnJheVs0XSAhPT0gXCJcIikgPyBOdW1iZXIoYXJnc0FycmF5WzRdKSA6IG51bGw7XG5cbiAgICAgIHRoaXMubmV4dEJnbSA9IHtcbiAgICAgICAgbmFtZSAgOiBuYW1lLFxuICAgICAgICB2b2x1bWU6IHZvbHVtZSxcbiAgICAgICAgcGFuICAgOiBwYW4sXG4gICAgICAgIHBpdGNoIDogcGl0Y2gsXG4gICAgICAgIHBvcyAgIDogcG9zLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg5fjg6njgrDjgqTjg7PjgrPjg57jg7Pjg4njgpLnmbvpjLJcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdFBsdWdpbkNvbW1hbmRzKCkge1xuICAgICAgdmFyIGNyb3NzRmFkZUJnbUNsYXNzID0gbmV3IENyb3NzRmFkZUJnbSgpO1xuXG4gICAgICB2YXIgX0dhbWVfSW50ZXJwcmV0ZXJfcGx1Z2luQ29tbWFuZCA9XG4gICAgICAgIEdhbWVfSW50ZXJwcmV0ZXIucHJvdG90eXBlLnBsdWdpbkNvbW1hbmQ7XG5cbiAgICAgIEdhbWVfSW50ZXJwcmV0ZXIucHJvdG90eXBlLnBsdWdpbkNvbW1hbmQgPSBmdW5jdGlvbihjb21tYW5kLCBhcmdzKSB7XG4gICAgICAgIF9HYW1lX0ludGVycHJldGVyX3BsdWdpbkNvbW1hbmQuY2FsbCh0aGlzLCBjb21tYW5kLCBhcmdzKTtcbiAgICAgICAgaWYgKGNvbW1hbmQgPT09IFwiQ3Jvc3NGYWRlQmdtXCIpIHtcbiAgICAgICAgICBzd2l0Y2ggKGFyZ3NbMF0pIHtcbiAgICAgICAgICAgIGNhc2UgXCJzZXRcIjpcbiAgICAgICAgICAgICAgY3Jvc3NGYWRlQmdtQ2xhc3Muc2V0QWxsKGFyZ3NbMV0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJzdGFydFwiOlxuICAgICAgICAgICAgICBjcm9zc0ZhZGVCZ21DbGFzcy5zdGFydENyb3NzRmFkZSgpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJkdXJhdGlvblNlY1wiOlxuICAgICAgICAgICAgICBjcm9zc0ZhZGVCZ21DbGFzcy5zZXREdXJhdGlvbihhcmdzWzFdKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwicmVzZXREdXJhdGlvblwiOlxuICAgICAgICAgICAgICBjcm9zc0ZhZGVCZ21DbGFzcy5yZXNldER1cmF0aW9uKCk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBDcm9zc0ZhZGVCZ20uaW5pdFBsdWdpbkNvbW1hbmRzKCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
