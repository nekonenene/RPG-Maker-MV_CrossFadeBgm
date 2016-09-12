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
// 2016/09/13 ver0.2.0 配布jsにbabelをかまし、Internet Explorerでも動作するように
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

        var name = argsArray[0] !== undefined && argsArray[0] !== "" ? String(argsArray[0]) : null;
        var volume = argsArray[1] !== undefined && argsArray[1] !== "" ? Number(argsArray[1]) : null;
        var pan = argsArray[2] !== undefined && argsArray[2] !== "" ? Number(argsArray[2]) : null;
        var pitch = argsArray[3] !== undefined && argsArray[3] !== "" ? Number(argsArray[3]) : null;
        var pos = argsArray[4] !== undefined && argsArray[4] !== "" ? Number(argsArray[4]) : null;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkhUTl9Dcm9zc0ZhZGVCZ20uanMiXSwibmFtZXMiOlsicGx1Z2luTmFtZSIsIkJnbUJ1ZmZlciIsImV4dGVuZEF1ZGlvTWFuYWdlciIsInNldEluZGV4Rm9yQ3VycmVudEJnbSIsIkF1ZGlvTWFuYWdlciIsIl9iZ21BcnJheSIsIl9iZ21CdWZmZXJBcnJheSIsInBsYXlCZ20iLCJiZ20iLCJwb3MiLCJpc0N1cnJlbnRCZ20iLCJ1cGRhdGVCZ21QYXJhbWV0ZXJzIiwic3RvcEJnbSIsIm5hbWUiLCJEZWNyeXB0ZXIiLCJoYXNFbmNyeXB0ZWRBdWRpbyIsInNob3VsZFVzZUh0bWw1QXVkaW8iLCJwbGF5RW5jcnlwdGVkQmdtIiwicHVzaEJ1ZmZlciIsIl9tZUJ1ZmZlciIsInBsYXlBbGxCdWZmZXJzIiwiY3JlYXRlRGVjcnlwdEJ1ZmZlciIsInVybCIsIl9ibG9iVXJsIiwiZm9yRWFjaCIsImJ1ZmZlciIsInN0b3AiLCJfaW5kZXhGb3JDdXJyZW50QmdtIiwiaW5kZXhGb3JDdXJyZW50QmdtIiwicGFyc2VJbnQiLCJsZW5ndGgiLCJjb3VudEJ1ZmZlcnMiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImdldCIsInNldCIsIl9idWZmZXIiLCJjb25maWd1cmFibGUiLCJfYmdtIiwiY29uc29sZSIsIndhcm4iLCJfbmV3QmdtIiwibmV3QmdtIiwiYXJyYW5nZU5ld0JnbSIsIl9jdXJyZW50QmdtIiwicHVzaCIsImV4dCIsImF1ZGlvRmlsZUV4dCIsIl9wYXRoIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZXh0VG9FbmNyeXB0RXh0IiwiZGVjcnlwdEhUTUw1QXVkaW8iLCJjcmVhdGVCdWZmZXIiLCJ1bnNoaWZ0IiwiaW5kZXgiLCJhdWRpb1BhcmFtZXRlciIsInVwZGF0ZUJ1ZmZlclBhcmFtZXRlcnMiLCJfYmdtVm9sdW1lIiwicGxheSIsIl9pbmRleCIsIl9xdWFudGl0eSIsInF1YW50aXR5IiwiaSIsInNsaWNlIiwibmV3QmdtQXJyYXkiLCJuZXdCZ21CdWZmZXJBcnJheSIsImN1cnJlbnRCZ20iLCJfYmdtTmFtZSIsImJnbU5hbWUiLCJTdHJpbmciLCJ2b2x1bWUiLCJwaXRjaCIsInBhbiIsIl9mYWRlRHVyYXRpb25TZWMiLCJmYWRlRHVyYXRpb25TZWMiLCJOdW1iZXIiLCJmYWRlSW4iLCJmYWRlT3V0Iiwic2VlayIsIkNyb3NzRmFkZUJnbSIsInBhcmFtZXRlcnMiLCJQbHVnaW5NYW5hZ2VyIiwiX2RlZmF1bHREdXJhdGlvblNlYyIsImR1cmF0aW9uU2VjIiwiZGVmYXVsdER1cmF0aW9uU2VjIiwiYmdtQnVmZmVyIiwibmV4dEJnbSIsInBvc2l0aW9uIiwiZ2V0QnVmZmVyc1Bvc2l0aW9uQnlJbmRleCIsInVuc2hpZnRCdWZmZXIiLCJyZWR1Y2VCdWZmZXJzIiwiZmFkZUluQnVmZmVyQnlJbmRleCIsImZhZGVPdXRCdWZmZXJCeUluZGV4IiwiX2FyZ3MiLCJhcmdzQXJyYXkiLCJzcGxpdCIsInVuZGVmaW5lZCIsImNyb3NzRmFkZUJnbUNsYXNzIiwiX0dhbWVfSW50ZXJwcmV0ZXJfcGx1Z2luQ29tbWFuZCIsIkdhbWVfSW50ZXJwcmV0ZXIiLCJwcm90b3R5cGUiLCJwbHVnaW5Db21tYW5kIiwiY29tbWFuZCIsImFyZ3MiLCJjYWxsIiwic2V0QWxsIiwic3RhcnRDcm9zc0ZhZGUiLCJzZXREdXJhdGlvbiIsInJlc2V0RHVyYXRpb24iLCJpbml0UGx1Z2luQ29tbWFuZHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMkNBLENBQUMsWUFBVztBQUNWOztBQUVBLE1BQUlBLGFBQWEsa0JBQWpCOztBQUVBOzs7OztBQUxVLE1BU0pDLFNBVEk7QUFXUix5QkFBYztBQUFBOztBQUNaQSxnQkFBVUMsa0JBQVY7QUFDQUQsZ0JBQVVFLHFCQUFWLENBQWdD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QVFBLE1BRks7QUFHYkUsZUFBUUEsR0FISztBQUliRCxpQkFBUUEsS0FKSztBQUtiOUQsZUFBUUE7QUFMSyxTQUFmO0FBT0Q7O0FBRUQ7Ozs7QUF6ZlE7QUFBQTtBQUFBLDBCQXdiaUI7QUFDdkIsZUFBTyxLQUFLeUUsbUJBQVo7QUFDRDtBQTFiTztBQUFBO0FBQUEsMkNBNGZvQjtBQUMxQixZQUFJZSxvQkFBb0IsSUFBSWxCLFlBQUosRUFBeEI7O0FBRUEsWUFBSW1CLGtDQUNGQyxpQkFBaUJDLFNBQWpCLENBQTJCQyxhQUQ3Qjs7QUFHQUYseUJBQWlCQyxTQUFqQixDQUEyQkMsYUFBM0IsR0FBMkMsVUFBU0MsT0FBVCxFQUFrQkMsSUFBbEIsRUFBd0I7QUFDakVMLDBDQUFnQ00sSUFBaEMsQ0FBcUMsSUFBckMsRUFBMkNGLE9BQTNDLEVBQW9EQyxJQUFwRDtBQUNBLGNBQUlELFlBQVksY0FBaEIsRUFBZ0M7QUFDOUIsb0JBQVFDLEtBQUssQ0FBTCxDQUFSO0FBQ0UsbUJBQUssS0FBTDtBQUNFTixrQ0FBa0JRLE1BQWxCLENBQXlCRixLQUFLLENBQUwsQ0FBekI7QUFDQTtBQUNGLG1CQUFLLE9BQUw7QUFDRU4sa0NBQWtCUyxjQUFsQjtBQUNBO0FBQ0YsbUJBQUssYUFBTDtBQUNFVCxrQ0FBa0JVLFdBQWxCLENBQThCSixLQUFLLENBQUwsQ0FBOUI7QUFDQTtBQUNGLG1CQUFLLGVBQUw7QUFDRU4sa0NBQWtCVyxhQUFsQjtBQUNBO0FBWko7QUFjRDtBQUNGLFNBbEJEO0FBbUJEO0FBcmhCTzs7QUFBQTtBQUFBOztBQXdoQlY3QixlQUFhOEIsa0JBQWI7QUFFRCxDQTFoQkQiLCJmaWxlIjoiSFROX0Nyb3NzRmFkZUJnbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gQ3Jvc3NGYWRlQmdtXG4vL1xuLy8gQ29weXJpZ2h0IChjKSAyMDE2IGhhdG9uZWtvZVxuLy8gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4vLyBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4vL1xuLy8gMjAxNi8wOS8xMyB2ZXIwLjIuMCDphY3luINqc+OBq2JhYmVs44KS44GL44G+44GX44CBSW50ZXJuZXQgRXhwbG9yZXLjgafjgoLli5XkvZzjgZnjgovjgojjgYbjgatcbi8vIDIwMTYvMDkvMTIgdmVyMC4xLjIg44Kz44Oh44Oz44OI44Gu6L+95Yqg44KE44CB44Ot44Kw5Ye65Yqb44Gu44Kz44Oh44Oz44OI44Ki44Km44OI44Gq44GpXG4vLyAyMDE2LzA5LzExIHZlcjAuMS4xIOeEoeWQjUJHTeOCkuWGjeeUn+OBmeOCi+OBqOOCr+ODqeODg+OCt+ODpeOBmeOCi+S4jeWFt+WQiOOBq+WvvuW/nOOAgWZpcnN0IHJlbGVhc2Vcbi8vIDIwMTYvMDkvMTEgdmVyMC4xLjAg44Kv44Ot44K544OV44Kn44O844OJ5qmf6IO944CB44Gy44Go44G+44Ga44Gu5a6M5oiQXG4vLyAyMDE2LzA5LzEwIHZlcjAuMC4xIOmWi+eZuumWi+Wni1xuLy9cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKjpcbiAqIEBwbHVnaW5kZXNjIEJHTeOCkuOCr+ODreOCueODleOCp+ODvOODiVxuICogQGF1dGhvciDjg4/jg4jjg43jgrPjgqggLSBodHRwOi8vaGF0by1uZWtvLngwLmNvbVxuICpcbiAqIEBoZWxwXG4gKlxuICog44OX44Op44Kw44Kk44Oz44Kz44Oe44Oz44OJOlxuICogICBDcm9zc0ZhZGVCZ20gc2V0IGJnbV9uYW1lICAgICAgICMg5qyh44Gr5rWB44GZ5puy44KS5oyH5a6a44GX44G+44GZXG4gKiAgIENyb3NzRmFkZUJnbSBzZXQgYmdtX25hbWUsNjAgICAgIyDjgqvjg7Pjg57jgafljLrliIfjgovjgajmrKHjgavmtYHjgZnmm7LjgIHpn7Pph4/jgarjganjga7mjIflrprjgYzlj6/og73jgafjgZnjgILjgqvjg7Pjg57jga7jgYLjgajjgavjgrnjg5rjg7zjgrnjgpLlhaXjgozjgabjga/jgYTjgZHjgb7jgZvjgpNcbiAqICAgQ3Jvc3NGYWRlQmdtIHN0YXJ0ICAgICAgICAgICAgICAjIOOCr+ODreOCueODleOCp+ODvOODieOCkumWi+Wni+OBl+OBvuOBmVxuICogICBDcm9zc0ZhZGVCZ20gc2V0RHVyYXRpb24gOC40MSAgICMg44OV44Kn44O844OJ5pmC6ZaT44KS5a6a576p44GX44G+44GZ77yI44GT44Gu5L6L44Gn44GvOC40Meenku+8iVxuICogICBDcm9zc0ZhZGVCZ20gcmVzZXREdXJhdGlvbiAgICAgICMg44OV44Kn44O844OJ5pmC6ZaT44KS44OH44OV44Kp44Or44OI5YCk44Gr5oi744GX44G+44GZXG4gKlxuICog44CQc2V044Kz44Oe44Oz44OJ44Gu6Kmz57Sw44CRXG4gKiAgIENyb3NzRmFkZUJnbSBzZXQgYmdtX25hbWUsdm9sdW1lLHBhbixwaXRjaCAgIyBzZXTjgrPjg57jg7Pjg4njgafjga8gNOOBpOOBruOCquODl+OCt+ODp+ODs+OBjOaMh+WumuOBp+OBjeOBvuOBmVxuICpcbiAqICAgPG9wdGlvbnM+XG4gKiAgIGJnbV9uYW1lOiBCR03lkI3jgafjgZnjgILnqbrnmb3jgpLlkKvjgpPjgafjga/jgYTjgZHjgb7jgZvjgpPjgILnqbrnmb3mloflrZfjgoTml6XmnKzoqp7jgpLlkKvjgoDjg5XjgqHjgqTjg6vlkI3jgpLkvb/jgYbjga7jga/pgb/jgZHjgb7jgZfjgofjgYZcbiAqICAgdm9sdW1lOiDpn7Pph4/jgafjgZnjgIIwIH4gMTAw44CB44OE44Kv44O844Or44Gu44CMQkdN44Gu5ryU5aWP44CN44Gu44OH44OV44Kp44Or44OI44Gg44GoIDkwXG4gKiAgIHBhbjog6Z+z44GM5bem5Y+z44Gu44Gp44Gh44KJ44Gr5a+E44Gj44Gm44GE44KL44GL44Gn44GZ44CCLTEwMCB+IDEwMOOAgeS4reW/g+OBryAwIOOBp+OBmVxuICogICBwaXRjaDog6Z+z44Gu6auY44GV44Gn44GZ44CC44K544OU44O844OJ44KC5aSJ44KP44Gj44Gm44GX44G+44GG44KI44GG44Gn44GZ44CCNTAgfiAyMDAg56iL5bqm44Gr44GX44G+44GX44KH44GG44CC44OH44OV44Kp44Or44OI44GvIDEwMFxuICpcbiAqICAgPGV4YW1wbGU+XG4gKiAgIENyb3NzRmFkZUJnbSBzZXQgU2hpcDEsOTAsMCwxMDAgIyDkvovjgYjjgbDjgZPjga7jgojjgYbjgavmjIflrprjgafjgY3jgb7jgZnjgILjgqvjg7Pjg57jga7jgYLjgajjgavjgrnjg5rjg7zjgrnjgpLlhaXjgozjgabjga/jgYTjgZHjgb7jgZvjgpNcbiAqICAgQ3Jvc3NGYWRlQmdtIHNldCBTaGlwMSwsLDEwMCAgICAjIOmAlOS4reOBruWApOOCkuecgeeVpeOBmeOCi+OBk+OBqOOBjOWPr+iDveOBp+OBmeOAguOBl+OBi+OBl+OAgUJHTeWQjeOBqOmfs+mHj+OBr+acgOS9jumZkOaMh+WumuOBl+OBn+aWueOBjOOBhOOBhOOBp+OBmVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMg55yB55Wl44GV44KM44Gf6Z+z6YeP44Gq44Gp44Gu5YCk44Gv44CB54++5Zyo5rWB44KM44Gm44KLQkdN44Gu5YCk44GM5L2/44KP44KM44G+44GZXG4gKlxuICog5rOo5oSP5LqL6aCFOlxuICogICDjg4Tjgq/jg7zjg6vjgafjga7jgIzjg4fjg5fjg63jgqTjg6Hjg7Pjg4jjgI3jgafjgrLjg7zjg6DjgpLlh7rlipvjgZnjgovjgajjgY3jgIHjgIzmnKrkvb/nlKjjg5XjgqHjgqTjg6vjgpLlkKvjgb7jgarjgYTjgI3jga7jg4Hjgqfjg4Pjgq/jgpJPTuOBq+OBl+OBn+WgtOWQiOOAgVxuICogICDjg4Tjgq/jg7zjg6vjga/jg5fjg6njgrDjgqTjg7PjgrPjg57jg7Pjg4njgafjganjga5CR03jgYzkvb/jgo/jgozjgabjgovjga7jgYvjgb7jgafjga/opovjgb7jgZvjgpPjga7jgafjgIFcbiAqICAg5pys5b2T44Gv5L2/44Gj44Gm44GE44KL44Gu44Gr44CB5L2/44Gj44Gm44Gq44GE44Go44G/44Gq44GV44KM44Gm5b+F6KaB44GqQkdN44OV44Kh44Kk44Or44GM5Ye65Yqb44GV44KM44Gq44GE5aC05ZCI44GM44GC44KK44G+44GZ44CCXG4gKlxuICogICDjgZPjgozjgafjga/jgZ3jga5CR03jgpLlho3nlJ/jgZfjgojjgYbjgajjgZfjgZ/jgajjgY3jgavjgqjjg6njg7zjgYznmbrnlJ/jgZfjgabjgZfjgb7jgYTjgb7jgZnjgIJcbiAqXG4gKiAgIOWvvuetluOBqOOBl+OBpuOBr+OAgeOAjOacquS9v+eUqOODleOCoeOCpOODq+OCkuWQq+OBvuOBquOBhOOAjeOBruODgeOCp+ODg+OCr+OCkk9GRuOBp+ODh+ODl+ODreOCpOODoeODs+ODiOOBmeOCi+OBi+OAgVxuICogICDjg4Djg5/jg7zjga7vvIjjgrLjg7zjg6Djgafjga/lrp/pmpvpgJrjgonjgarjgYTvvInjg57jg4Pjg5fjgpLnlKjmhI/jgZfjgabjgIHlh7rlipvjgZXjgozjgarjgYRCR03jgpLmvJTlpY/jgZnjgovjgqTjg5njg7Pjg4jjgpLjgZ3jgZPjgavnva7jgY/jgajjgYTjgYTjgYvjgajmgJ3jgYTjgb7jgZnjgIJcbiAqXG4gKiBAcGFyYW0gRGVmYXVsdCBGYWRlIER1cmF0aW9uIFNlY1xuICogQGRlc2Mg44OH44OV44Kp44Or44OI44Gu44OV44Kn44O844OJ5pmC6ZaT77yI56eS77yJXG4gKiBAZGVmYXVsdCAxLjIwXG4gKlxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIHBsdWdpbk5hbWUgPSBcIkhUTl9Dcm9zc0ZhZGVCZ21cIjtcblxuICAvKipcbiAgICogYmdtIOOBryBBcnJheSDjgq/jg6njgrlcbiAgICogYnVmZmVyIOOBryBXZWJBdWRpbyDjgq/jg6njgrnjgIHjgoLjgZfjgY/jga8gSHRtbDVBdWRpbyDjgq/jg6njgrlcbiAgICovXG4gIGNsYXNzIEJnbUJ1ZmZlciB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgIEJnbUJ1ZmZlci5leHRlbmRBdWRpb01hbmFnZXIoKTtcbiAgICAgIEJnbUJ1ZmZlci5zZXRJbmRleEZvckN1cnJlbnRCZ20oMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OE44Kv44O844Or44GuIEF1ZGlvTWFuYWdlciDjgq/jg6njgrnjgpLmi6HlvLVcbiAgICAgKlxuICAgICAqIEBGSVhNRSDku5bjga7jg5fjg6njgrDjgqTjg7PjgYwgcGxheUJnbSgpIOOBqOOBi+aLoeW8teOBmeOCi+OBqOOBk+OBruODl+ODqeOCsOOCpOODs+OBjOWLleOBi+OBquOBj+OBquOCi1xuICAgICAqL1xuICAgIHN0YXRpYyBleHRlbmRBdWRpb01hbmFnZXIoKSB7XG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5ID0gW107XG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5ID0gW107XG5cbiAgICAgIC8qKiBCR00g44Gu5YaN55SfICovXG4gICAgICBBdWRpb01hbmFnZXIucGxheUJnbSA9IGZ1bmN0aW9uKGJnbSwgcG9zKSB7XG4gICAgICAgIGlmIChBdWRpb01hbmFnZXIuaXNDdXJyZW50QmdtKGJnbSkpIHtcbiAgICAgICAgICBBdWRpb01hbmFnZXIudXBkYXRlQmdtUGFyYW1ldGVycyhiZ20pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIEF1ZGlvTWFuYWdlci5zdG9wQmdtKCk7XG4gICAgICAgICAgaWYgKGJnbS5uYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZihEZWNyeXB0ZXIuaGFzRW5jcnlwdGVkQXVkaW8gJiYgQXVkaW9NYW5hZ2VyLnNob3VsZFVzZUh0bWw1QXVkaW8oKSl7XG4gICAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5wbGF5RW5jcnlwdGVkQmdtKGJnbSwgcG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBiZ20ucG9zID0gcG9zO1xuICAgICAgICAgICAgICBCZ21CdWZmZXIucHVzaEJ1ZmZlcihiZ20pO1xuICAgICAgICAgICAgICAvLyBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5jcmVhdGVCdWZmZXIoJ2JnbScsIGJnbS5uYW1lKTtcbiAgICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnVwZGF0ZUJnbVBhcmFtZXRlcnMoYmdtKTtcbiAgICAgICAgICAgICAgaWYgKCFBdWRpb01hbmFnZXIuX21lQnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXIucGxheSh0cnVlLCBwb3MgfHwgMCk7XG4gICAgICAgICAgICAgICAgQmdtQnVmZmVyLnBsYXlBbGxCdWZmZXJzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXVkaW9NYW5hZ2VyLnVwZGF0ZUN1cnJlbnRCZ20oYmdtLCBwb3MpO1xuICAgICAgfTtcblxuICAgICAgLyoqIHBsYXlFbmNyeXB0ZWRCZ20g44GL44KJ5ZG844Gw44KM44KL44CC5pqX5Y+35YyW44GV44KM44GfQkdN44KS5YaN55Sf44GZ44KL44Gf44KB44Gu44OQ44OD44OV44Kh44KS5L2c5oiQICovXG4gICAgICBBdWRpb01hbmFnZXIuY3JlYXRlRGVjcnlwdEJ1ZmZlciA9IGZ1bmN0aW9uKHVybCwgYmdtLCBwb3Mpe1xuICAgICAgICBBdWRpb01hbmFnZXIuX2Jsb2JVcmwgPSB1cmw7XG4gICAgICAgIGJnbS5wb3MgPSBwb3M7XG4gICAgICAgIEJnbUJ1ZmZlci5wdXNoQnVmZmVyKGJnbSk7XG4gICAgICAgIC8vIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyID0gQXVkaW9NYW5hZ2VyLmNyZWF0ZUJ1ZmZlcignYmdtJywgYmdtLm5hbWUpO1xuICAgICAgICBBdWRpb01hbmFnZXIudXBkYXRlQmdtUGFyYW1ldGVycyhiZ20pO1xuICAgICAgICBpZiAoIUF1ZGlvTWFuYWdlci5fbWVCdWZmZXIpIHtcbiAgICAgICAgICAvLyBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlci5wbGF5KHRydWUsIHBvcyB8fCAwKTtcbiAgICAgICAgICBCZ21CdWZmZXIucGxheUFsbEJ1ZmZlcnMoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBdWRpb01hbmFnZXIudXBkYXRlQ3VycmVudEJnbShiZ20sIHBvcyk7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEJHTSDjga7lho3nlJ/lgZzmraJcbiAgICAgICAqIOODkOODg+ODleOCoeODvOmFjeWIl+OBr+epuuOBq+OBmeOCi1xuICAgICAgICovXG4gICAgICBBdWRpb01hbmFnZXIuc3RvcEJnbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LmZvckVhY2goZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgaWYoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBidWZmZXIuc3RvcCgpO1xuICAgICAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBCZ21CdWZmZXIuc2V0SW5kZXhGb3JDdXJyZW50QmdtKDApO1xuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5ID0gW107XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkgPSBbXTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogX2JnbUJ1ZmZlciDjga8gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheSDjgYvjgonoqq3jgb/lj5bjgotcbiAgICAgKiBfY3VycmVudEJnbSDjga8gQXVkaW9NYW5hZ2VyLl9iZ21BcnJheSDjgYvjgonoqq3jgb/lj5bjgotcbiAgICAgKiDjgZPjgZPjgafjga/jgIHjgZ3jga4gX2JnbUJ1ZmZlciwgX2N1cnJlbnRCZ20g44Gu5pu444GN6L6844G/44O76Kqt44G/6L6844G/44Gu5a++6LGh44Go44Gq44KL6YWN5YiX44GuaW5kZXgoMH4p44KS5oyH5a6a44GZ44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX2luZGV4Rm9yQ3VycmVudEJnbTogTnVtYmVyIF9iZ21CdWZmZXIsIF9jdXJyZW50QmdtIOOBruWvvuixoeOBqOOBquOCi+mFjeWIl+OBrmluZGV4KDB+KVxuICAgICAqL1xuICAgIHN0YXRpYyBzZXRJbmRleEZvckN1cnJlbnRCZ20oX2luZGV4Rm9yQ3VycmVudEJnbSkge1xuICAgICAgdmFyIGluZGV4Rm9yQ3VycmVudEJnbSA9IHBhcnNlSW50KF9pbmRleEZvckN1cnJlbnRCZ20pO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgaWYoaW5kZXhGb3JDdXJyZW50QmdtID09PSAwIHx8ICgwIDw9IGluZGV4Rm9yQ3VycmVudEJnbSAmJiBpbmRleEZvckN1cnJlbnRCZ20gPCBsZW5ndGgpKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBdWRpb01hbmFnZXIsICdfYmdtQnVmZmVyJywge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpbmRleEZvckN1cnJlbnRCZ21dO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbihfYnVmZmVyKSB7XG4gICAgICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2luZGV4Rm9yQ3VycmVudEJnbV0gPSBfYnVmZmVyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBdWRpb01hbmFnZXIsICdfY3VycmVudEJnbScsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhGb3JDdXJyZW50QmdtXTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24oX2JnbSkge1xuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheVtpbmRleEZvckN1cnJlbnRCZ21dID0gX2JnbTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIiEhV0FSTiEhIGluZGV4IG51bWJlciBpcyBub3QgdmFsaWQgQCBzZXRJbmRleEZvckN1cnJlbnRCZ21cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OQ44OD44OV44Kh44O844KS5b6M44KN44Gr6Laz44GZXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX25ld0JnbTogQXJyYXkg5L6LIHtuYW1lOiBcImJnbV90aXRsZVwiLCB2b2x1bWU6IDkwLCBwaXRjaDogMTAwLCBwYW46IDAsIHBvczogMH1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHVzaEJ1ZmZlcihfbmV3QmdtKSB7XG4gICAgICAvLyDmnKrlrprnvqnjga7pg6jliIbjga/nj77lnKjjga7mm7Ljga7lgKTjgpLjgrvjg4Pjg4jjgZfjgabjgYLjgZLjgotcbiAgICAgIHZhciBuZXdCZ20gPSBCZ21CdWZmZXIuYXJyYW5nZU5ld0JnbShfbmV3QmdtLCBBdWRpb01hbmFnZXIuX2N1cnJlbnRCZ20pO1xuXG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5LnB1c2gobmV3QmdtKTtcblxuICAgICAgLy8g54Sh5ZCNQkdN44KC5puy44Go44GX44Gm5omx44GG44GM44CB44OQ44OD44OV44Kh44O844Go44GX44Gm44GvbnVsbFxuICAgICAgaWYobmV3QmdtLm5hbWUgPT09IFwiXCIpIHtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS5wdXNoKG51bGwpO1xuICAgICAgfSBlbHNlIGlmKG5ld0JnbS5uYW1lICE9PSBudWxsKSB7XG4gICAgICAgIC8vIOaal+WPt+WMluOBleOCjOOBn+OCquODvOODh+OCo+OCquODleOCoeOCpOODq+OBruWgtOWQiCBAVE9ETyDpgJrjgonjgarjgYTjgaPjgb3jgYTjga7jgafmtojjgZfjgabjgoLjgYTjgYTjgYvjgoJcbiAgICAgICAgaWYoRGVjcnlwdGVyLmhhc0VuY3J5cHRlZEF1ZGlvICYmIEF1ZGlvTWFuYWdlci5zaG91bGRVc2VIdG1sNUF1ZGlvKCkpe1xuICAgICAgICAgIHZhciBleHQgPSBBdWRpb01hbmFnZXIuYXVkaW9GaWxlRXh0KCk7XG4gICAgICAgICAgdmFyIHVybCA9IEF1ZGlvTWFuYWdlci5fcGF0aCArICdiZ20vJyArIGVuY29kZVVSSUNvbXBvbmVudChiZ20ubmFtZSkgKyBleHQ7XG4gICAgICAgICAgdXJsID0gRGVjcnlwdGVyLmV4dFRvRW5jcnlwdEV4dCh1cmwpO1xuICAgICAgICAgIERlY3J5cHRlci5kZWNyeXB0SFRNTDVBdWRpbyh1cmwsIGJnbSwgYmdtLnBvcyk7XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9ibG9iVXJsID0gdXJsO1xuICAgICAgICB9XG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkucHVzaChBdWRpb01hbmFnZXIuY3JlYXRlQnVmZmVyKCdiZ20nLCBuZXdCZ20ubmFtZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgbmV4dCBiZ20gbmFtZSBpcyBudWxsIEAgcHVzaEJ1ZmZlclwiKTtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS5wdXNoKG51bGwpOyAvLyBfYmdtQXJyYXkg44Gu5YCL5pWw44Go5pW05ZCI5oCn44KS5L+d44Gk44Gf44KB5oy/5YWlXG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhcIkJ1ZmZlcuOBruWAi+aVsDogXCIgKyBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCkpOyAvLyBAVE9ETzog44GC44Go44Gn5raI44GZXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog44OQ44OD44OV44Kh44O844KS5YWI6aCt44Gr6Laz44GZXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX25ld0JnbTogQXJyYXkg5L6LIHtuYW1lOiBcImJnbV90aXRsZVwiLCB2b2x1bWU6IDkwLCBwaXRjaDogMTAwLCBwYW46IDAsIHBvczogMH1cbiAgICAgKi9cbiAgICBzdGF0aWMgdW5zaGlmdEJ1ZmZlcihfbmV3QmdtKSB7XG4gICAgICAvLyDmnKrlrprnvqnjga7pg6jliIbjga/nj77lnKjjga7mm7Ljga7lgKTjgpLjgrvjg4Pjg4jjgZfjgabjgYLjgZLjgotcbiAgICAgIHZhciBuZXdCZ20gPSBCZ21CdWZmZXIuYXJyYW5nZU5ld0JnbShfbmV3QmdtLCBBdWRpb01hbmFnZXIuX2N1cnJlbnRCZ20pO1xuXG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUFycmF5LnVuc2hpZnQobmV3QmdtKTtcblxuICAgICAgLy8g54Sh5ZCNQkdN44KC5puy44Go44GX44Gm5omx44GG44GM44CB44OQ44OD44OV44Kh44O844Go44GX44Gm44GvbnVsbFxuICAgICAgaWYobmV3QmdtLm5hbWUgPT09IFwiXCIpIHtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS51bnNoaWZ0KG51bGwpO1xuICAgICAgfSBlbHNlIGlmKG5ld0JnbS5uYW1lICE9PSBudWxsKSB7XG4gICAgICAgIC8vIOaal+WPt+WMluOBleOCjOOBn+OCquODvOODh+OCo+OCquODleOCoeOCpOODq+OBruWgtOWQiCBAVE9ETyDpgJrjgonjgarjgYTjgaPjgb3jgYTjga7jgafmtojjgZfjgabjgoLjgYTjgYTjgYvjgoJcbiAgICAgICAgaWYoRGVjcnlwdGVyLmhhc0VuY3J5cHRlZEF1ZGlvICYmIEF1ZGlvTWFuYWdlci5zaG91bGRVc2VIdG1sNUF1ZGlvKCkpe1xuICAgICAgICAgIHZhciBleHQgPSBBdWRpb01hbmFnZXIuYXVkaW9GaWxlRXh0KCk7XG4gICAgICAgICAgdmFyIHVybCA9IEF1ZGlvTWFuYWdlci5fcGF0aCArICdiZ20vJyArIGVuY29kZVVSSUNvbXBvbmVudChiZ20ubmFtZSkgKyBleHQ7XG4gICAgICAgICAgdXJsID0gRGVjcnlwdGVyLmV4dFRvRW5jcnlwdEV4dCh1cmwpO1xuICAgICAgICAgIERlY3J5cHRlci5kZWNyeXB0SFRNTDVBdWRpbyh1cmwsIGJnbSwgYmdtLnBvcyk7XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9ibG9iVXJsID0gdXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheS51bnNoaWZ0KEF1ZGlvTWFuYWdlci5jcmVhdGVCdWZmZXIoJ2JnbScsIG5ld0JnbS5uYW1lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXCIhIVdBUk4hISBuZXh0IGJnbSBuYW1lIGlzIG51bGwgQCB1bnNoaWZ0QnVmZmVyXCIpO1xuICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LnVuc2hpZnQobnVsbCk7IC8vIF9iZ21BcnJheSDjga7lgIvmlbDjgajmlbTlkIjmgKfjgpLkv53jgaTjgZ/jgoHmjL/lhaVcbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiQnVmZmVy44Gu5YCL5pWwOiBcIiArIEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKSk7IC8vIEBUT0RPOiDjgYLjgajjgafmtojjgZlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjg5Djg4Pjg5XjgqHjg7zjga7lgIvmlbDjgpLmlbDjgYjjgotcbiAgICAgKlxuICAgICAqIEByZXR1cm4gTnVtYmVyXG4gICAgICovXG4gICAgc3RhdGljIGNvdW50QnVmZmVycygpIHtcbiAgICAgIHJldHVybiBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDjgZnjgbnjgabjga7jg5Djg4Pjg5XjgqHjg7zjga7lho3nlJ/jgpLmraLjgoHjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgbXV0ZUFsbEJ1ZmZlcnMoKSB7XG4gICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5LmZvckVhY2goZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgIGJ1ZmZlci5zdG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOOBmeOBueOBpuOBruODkOODg+ODleOCoeODvOOCkuWGjeeUn+OBmeOCi1xuICAgICAqL1xuICAgIHN0YXRpYyBwbGF5QWxsQnVmZmVycygpIHtcbiAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkuZm9yRWFjaChmdW5jdGlvbihidWZmZXIsIGluZGV4KSB7XG4gICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHZhciBhdWRpb1BhcmFtZXRlciA9IEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdO1xuXG4gICAgICAgICAgaWYoYXVkaW9QYXJhbWV0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci51cGRhdGVCdWZmZXJQYXJhbWV0ZXJzKGJ1ZmZlciwgQXVkaW9NYW5hZ2VyLl9iZ21Wb2x1bWUsIGF1ZGlvUGFyYW1ldGVyKTtcbiAgICAgICAgICAgIGJ1ZmZlci5wbGF5KHRydWUsIGF1ZGlvUGFyYW1ldGVyLnBvcyB8fCAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGV4KDB+KeOCkuaMh+WumuOBl+OAgeWvvuixoeOBruODkOODg+ODleOCoeODvOOCkuWGjeeUn+OBmeOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleDogTnVtYmVyIOWvvuixoeODkOODg+ODleOCoeODvOOBruOAgeODkOODg+ODleOCoeODvOmFjeWIl+OBq+OBiuOBkeOCi+OCpOODs+ODh+ODg+OCr+OCuSgwfilcbiAgICAgKi9cbiAgICBzdGF0aWMgcGxheUJ1ZmZlckJ5SW5kZXgoX2luZGV4KSB7XG4gICAgICB2YXIgaW5kZXggPSBwYXJzZUludChfaW5kZXgpO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgaWYoMCA8PSBpbmRleCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgYnVmZmVyID0gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpbmRleF07XG5cbiAgICAgICAgaWYoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgdmFyIGF1ZGlvUGFyYW1ldGVyID0gQXVkaW9NYW5hZ2VyLl9iZ21BcnJheVtpbmRleF07XG5cbiAgICAgICAgICBpZihhdWRpb1BhcmFtZXRlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnVwZGF0ZUJ1ZmZlclBhcmFtZXRlcnMoYnVmZmVyLCBBdWRpb01hbmFnZXIuX2JnbVZvbHVtZSwgYXVkaW9QYXJhbWV0ZXIpO1xuICAgICAgICAgICAgYnVmZmVyLnBsYXkodHJ1ZSwgYXVkaW9QYXJhbWV0ZXIucG9zIHx8IDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIHBsYXlCdWZmZXJCeUluZGV4XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODkOODg+ODleOCoeODvOOCkuaMh+WumuWAi+aVsOOBq+a4m+OCieOBmVxuICAgICAqXG4gICAgICogQHBhcmFtIHF1YW50aXR5OiBOdW1iZXIg44GT44Gu5pWw44GrIGJ1ZmZlciDjga7lgIvmlbDjgpLmuJvjgonjgZlcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVkdWNlQnVmZmVycyhfcXVhbnRpdHkpIHtcbiAgICAgIHZhciBxdWFudGl0eSA9IHBhcnNlSW50KF9xdWFudGl0eSk7XG4gICAgICB2YXIgbGVuZ3RoID0gQmdtQnVmZmVyLmNvdW50QnVmZmVycygpO1xuXG4gICAgICBmb3IodmFyIGkgPSBxdWFudGl0eTsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaV0gIT09IG51bGwpIHtcbiAgICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2ldLnN0b3AoKTtcbiAgICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2ldID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheSA9IEF1ZGlvTWFuYWdlci5fYmdtQXJyYXkuc2xpY2UoMCwgcXVhbnRpdHkpO1xuICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheSA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXkuc2xpY2UoMCwgcXVhbnRpdHkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGV4KDB+KeOCkuaMh+WumuOBl+OAgeWvvuixoeOBruODkOODg+ODleOCoeODvOOCkuWJiumZpOOBmeOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIF9pbmRleDogTnVtYmVyIOWvvuixoeODkOODg+ODleOCoeODvOOBruOAgeODkOODg+ODleOCoeODvOmFjeWIl+OBq+OBiuOBkeOCi+OCpOODs+ODh+ODg+OCr+OCuSgwfilcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVtb3ZlQnVmZmVyQnlJbmRleChfaW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IHBhcnNlSW50KF9pbmRleCk7XG4gICAgICB2YXIgbGVuZ3RoID0gQmdtQnVmZmVyLmNvdW50QnVmZmVycygpO1xuXG4gICAgICB2YXIgbmV3QmdtQXJyYXkgPSBbXTtcbiAgICAgIHZhciBuZXdCZ21CdWZmZXJBcnJheSA9IFtdO1xuXG4gICAgICBpZigwIDw9IGluZGV4ICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmKGkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICBuZXdCZ21BcnJheS5wdXNoKEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaV0pO1xuICAgICAgICAgICAgbmV3QmdtQnVmZmVyQXJyYXkucHVzaChBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2ldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpXS5zdG9wKCk7XG4gICAgICAgICAgICBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2ldID0gbnVsbDtcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaV0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXkgPSBuZXdCZ21BcnJheTtcbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheSA9IG5ld0JnbUJ1ZmZlckFycmF5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIHJlbW92ZUJ1ZmZlckJ5SW5kZXhcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kZXgoMH4p44KS5oyH5a6a44GX44CB5a++6LGh44Gu44OQ44OD44OV44Kh44O844KS44Ki44OD44OX44OH44O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX2luZGV4OiBOdW1iZXIg44Ki44OD44OX44OH44O844OI5a++6LGh44Go44GZ44KL44OQ44OD44OV44Kh44O844Gu44CB44OQ44OD44OV44Kh44O86YWN5YiX44Gr44GK44GR44KL44Kk44Oz44OH44OD44Kv44K5KDB+KVxuICAgICAqIEBwYXJhbSBfbmV3QmdtOiBBcnJheSDkvosge25hbWU6IFwiYmdtX3RpdGxlXCIsIHZvbHVtZTogOTAsIHBpdGNoOiAxMDAsIHBhbjogMCwgcG9zOiAwfVxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVCdWZmZXJCeUluZGV4KF9pbmRleCwgX25ld0JnbSkge1xuICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoX2luZGV4KTtcbiAgICAgIHZhciBsZW5ndGggPSBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCk7XG5cbiAgICAgIGlmKDAgPD0gaW5kZXggJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhdO1xuICAgICAgICB2YXIgY3VycmVudEJnbSA9IEF1ZGlvTWFuYWdlci5fYmdtQXJyYXlbaW5kZXhdO1xuICAgICAgICB2YXIgbmV3QmdtID0gQmdtQnVmZmVyLmFycmFuZ2VOZXdCZ20oX25ld0JnbSwgY3VycmVudEJnbSk7XG5cbiAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheVtpbmRleF0gPSBuZXdCZ207XG4gICAgICAgIEF1ZGlvTWFuYWdlci51cGRhdGVCdWZmZXJQYXJhbWV0ZXJzKGJ1ZmZlciwgQXVkaW9NYW5hZ2VyLl9iZ21Wb2x1bWUsIG5ld0JnbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXCIhIVdBUk4hISBpbmRleCBudW1iZXIgaXMgbm90IHZhbGlkIEAgdXBkYXRlQnVmZmVyQnlJbmRleFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCR03lkI3jgpLjgoLjgajjgavjg5Djg4Pjg5XjgqHjg7zkuIDopqfjgpLmpJzntKLjgZfjgIHlr77osaHjga7jg5Djg4Pjg5XjgqHjg7zjgpLjgqLjg4Pjg5fjg4fjg7zjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBfYmdtTmFtZTogU3RyaW5nIOabtOaWsOOBl+OBn+OBhCBCR03lkI1cbiAgICAgKiBAcGFyYW0gX25ld0JnbTogQXJyYXkg5L6LIHtuYW1lOiBcImJnbV90aXRsZVwiLCB2b2x1bWU6IDkwLCBwaXRjaDogMTAwLCBwYW46IDAsIHBvczogMH1cbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlQnVmZmVyQnlCZ21OYW1lKF9iZ21OYW1lLCBfbmV3QmdtKSB7XG4gICAgICB2YXIgYmdtTmFtZSA9IFN0cmluZyhfYmdtTmFtZSk7XG5cbiAgICAgIEF1ZGlvTWFuYWdlci5fYmdtQXJyYXkuZm9yRWFjaChmdW5jdGlvbihiZ20sIGluZGV4KSB7XG4gICAgICAgIGlmKGJnbS5uYW1lID09PSBiZ21OYW1lKSB7XG4gICAgICAgICAgdmFyIGJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhdO1xuICAgICAgICAgIHZhciBjdXJyZW50QmdtID0gQXVkaW9NYW5hZ2VyLl9iZ21BcnJheVtpbmRleF07XG4gICAgICAgICAgdmFyIG5ld0JnbSA9IEJnbUJ1ZmZlci5hcnJhbmdlTmV3QmdtKF9uZXdCZ20sIGN1cnJlbnRCZ20pO1xuXG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9iZ21BcnJheVtpbmRleF0gPSBuZXdCZ207XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLnVwZGF0ZUJ1ZmZlclBhcmFtZXRlcnMoYnVmZmVyLCBBdWRpb01hbmFnZXIuX2JnbVZvbHVtZSwgbmV3QmdtKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5pyq5a6a576p44Gu5YCk44GvIGN1cnJlbnRCZ20g44Gu5YCk44KS5L2/44GG44KI44GG6Kq/5pW0XG4gICAgICpcbiAgICAgKiBAcGFyYW0gX25ld0JnbTogQXJyYXkg5paw44GX44GEIEJHTVxuICAgICAqIEBwYXJhbSBfY3VycmVudEJnbTogQXJyYXkg54++5Zyo44GuIEJHTVxuICAgICAqIEByZXR1cm4gbmV3QmdtOiBBcnJheSDoqr/mlbTjgZXjgozjgZ/mlrDjgZfjgYQgQkdNXG4gICAgICovXG4gICAgc3RhdGljIGFycmFuZ2VOZXdCZ20oX25ld0JnbSwgX2N1cnJlbnRCZ20pIHtcbiAgICAgIHZhciBuZXdCZ20gPSBfbmV3QmdtO1xuXG4gICAgICBpZihuZXdCZ20ubmFtZSA9PT0gbnVsbCkge1xuICAgICAgICBuZXdCZ20ubmFtZSA9IF9jdXJyZW50QmdtLm5hbWU7XG4gICAgICB9XG4gICAgICBpZihuZXdCZ20udm9sdW1lID09PSBudWxsKSB7XG4gICAgICAgIG5ld0JnbS52b2x1bWUgPSBfY3VycmVudEJnbSA/IF9jdXJyZW50QmdtLnZvbHVtZSA6IDkwO1xuICAgICAgfVxuICAgICAgaWYobmV3QmdtLnBpdGNoID09PSBudWxsKSB7XG4gICAgICAgIG5ld0JnbS5waXRjaCA9IF9jdXJyZW50QmdtID8gX2N1cnJlbnRCZ20ucGl0Y2ggOiAxMDA7XG4gICAgICB9XG4gICAgICBpZihuZXdCZ20ucGFuID09PSBudWxsKSB7XG4gICAgICAgIG5ld0JnbS5wYW4gPSBfY3VycmVudEJnbSA/IF9jdXJyZW50QmdtLnBhbiA6IDA7XG4gICAgICB9XG4gICAgICBpZihuZXdCZ20ucG9zID09PSBudWxsKSB7XG4gICAgICAgIG5ld0JnbS5wb3MgPSBfY3VycmVudEJnbSA/IF9jdXJyZW50QmdtLnBvcyA6IDA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXdCZ207XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kZXgoMH4p44KS5oyH5a6a44GX44CB5a++6LGh44Gu44OQ44OD44OV44Kh44O844KS44OV44Kn44O844OJ44Kk44OzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX2luZGV4OiBOdW1iZXIg44Ki44OD44OX44OH44O844OI5a++6LGh44Go44GZ44KL44OQ44OD44OV44Kh44O844Gu44CB44OQ44OD44OV44Kh44O86YWN5YiX44Gr44GK44GR44KL44Kk44Oz44OH44OD44Kv44K5KDB+KVxuICAgICAqIEBwYXJhbSBfZmFkZUR1cmF0aW9uU2VjOiBOdW1iZXIg44OV44Kn44O844OJ44Kk44Oz44Gr44GL44GR44KL5pmC6ZaT77yI56eS77yJXG4gICAgICovXG4gICAgc3RhdGljIGZhZGVJbkJ1ZmZlckJ5SW5kZXgoX2luZGV4LCBfZmFkZUR1cmF0aW9uU2VjKSB7XG4gICAgICB2YXIgaW5kZXggPSBwYXJzZUludChfaW5kZXgpO1xuICAgICAgdmFyIGZhZGVEdXJhdGlvblNlYyA9IE51bWJlcihfZmFkZUR1cmF0aW9uU2VjKTtcbiAgICAgIHZhciBsZW5ndGggPSBCZ21CdWZmZXIuY291bnRCdWZmZXJzKCk7XG5cbiAgICAgIGlmKDAgPD0gaW5kZXggJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IEF1ZGlvTWFuYWdlci5fYmdtQnVmZmVyQXJyYXlbaW5kZXhdO1xuXG4gICAgICAgIGlmKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgIGJ1ZmZlci5mYWRlSW4oZmFkZUR1cmF0aW9uU2VjKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiISFXQVJOISEgaW5kZXggbnVtYmVyIGlzIG5vdCB2YWxpZCBAIGZhZGVJbkJ1ZmZlckJ5SW5kZXhcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kZXgoMH4p44KS5oyH5a6a44GX44CB5a++6LGh44Gu44OQ44OD44OV44Kh44O844KS44OV44Kn44O844OJ44Ki44Km44OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gX2luZGV4OiBOdW1iZXIg44Ki44OD44OX44OH44O844OI5a++6LGh44Go44GZ44KL44OQ44OD44OV44Kh44O844Gu44CB44OQ44OD44OV44Kh44O86YWN5YiX44Gr44GK44GR44KL44Kk44Oz44OH44OD44Kv44K5KDB+KVxuICAgICAqIEBwYXJhbSBfZmFkZUR1cmF0aW9uU2VjOiBOdW1iZXIg44OV44Kn44O844OJ44Ki44Km44OI44Gr44GL44GR44KL5pmC6ZaT77yI56eS77yJXG4gICAgICovXG4gICAgc3RhdGljIGZhZGVPdXRCdWZmZXJCeUluZGV4KF9pbmRleCwgX2ZhZGVEdXJhdGlvblNlYykge1xuICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoX2luZGV4KTtcbiAgICAgIHZhciBmYWRlRHVyYXRpb25TZWMgPSBOdW1iZXIoX2ZhZGVEdXJhdGlvblNlYyk7XG4gICAgICB2YXIgbGVuZ3RoID0gQmdtQnVmZmVyLmNvdW50QnVmZmVycygpO1xuXG4gICAgICBpZigwIDw9IGluZGV4ICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBBdWRpb01hbmFnZXIuX2JnbUJ1ZmZlckFycmF5W2luZGV4XTtcblxuICAgICAgICBpZihidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICBidWZmZXIuZmFkZU91dChmYWRlRHVyYXRpb25TZWMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXCIhIVdBUk4hISBpbmRleCBudW1iZXIgaXMgbm90IHZhbGlkIEAgZmFkZU91dEJ1ZmZlckJ5SW5kZXhcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIGdldEJ1ZmZlcnNQb3NpdGlvbkJ5SW5kZXgoX2luZGV4KSB7XG4gICAgICB2YXIgaW5kZXggPSBwYXJzZUludChfaW5kZXgpO1xuICAgICAgdmFyIGxlbmd0aCA9IEJnbUJ1ZmZlci5jb3VudEJ1ZmZlcnMoKTtcblxuICAgICAgaWYoMCA8PSBpbmRleCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgYnVmZmVyID0gQXVkaW9NYW5hZ2VyLl9iZ21CdWZmZXJBcnJheVtpbmRleF07XG5cbiAgICAgICAgaWYoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIChidWZmZXIuc2VlaygpIHx8IDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXCIhIVdBUk4hISBpbmRleCBudW1iZXIgaXMgbm90IHZhbGlkIEAgZmFkZUluQnVmZmVyQnlJbmRleFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjbGFzcyBDcm9zc0ZhZGVCZ20ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgLy8g44OX44Op44Kw44Kk44Oz44OR44Op44Oh44O844K/44O844GL44KJ44OH44OV44Kp44Or44OI44OV44Kn44O844OJ5pmC6ZaT44KS6Kit5a6aXG4gICAgICB2YXIgcGFyYW1ldGVycyA9IFBsdWdpbk1hbmFnZXIucGFyYW1ldGVycyhwbHVnaW5OYW1lKTtcbiAgICAgIHRoaXMuX2RlZmF1bHREdXJhdGlvblNlYyA9IE51bWJlcihwYXJhbWV0ZXJzW1wiRGVmYXVsdCBGYWRlIER1cmF0aW9uIFNlY1wiXSk7XG4gICAgICB0aGlzLmR1cmF0aW9uU2VjID0gdGhpcy5kZWZhdWx0RHVyYXRpb25TZWM7XG5cbiAgICAgIHRoaXMuYmdtQnVmZmVyID0gbmV3IEJnbUJ1ZmZlcigpO1xuXG4gICAgICB0aGlzLm5leHRCZ20gPSB7XG4gICAgICAgIG5hbWU6IFwiXCIsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBkZWZhdWx0RHVyYXRpb25TZWMg44KS5Y+W5b6X44CBc2V0IOOBr+OBl+OBquOBhCAqL1xuICAgIGdldCBkZWZhdWx0RHVyYXRpb25TZWMoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGVmYXVsdER1cmF0aW9uU2VjO1xuICAgIH1cblxuICAgIC8qKiDjgq/jg63jgrnjg5Xjgqfjg7zjg4njgpLplovlp4sgKi9cbiAgICBzdGFydENyb3NzRmFkZSgpIHtcbiAgICAgIGlmKEF1ZGlvTWFuYWdlci5fY3VycmVudEJnbSAhPT0gbnVsbCkge1xuICAgICAgICBpZih0aGlzLm5leHRCZ20ubmFtZSAhPT0gQXVkaW9NYW5hZ2VyLl9jdXJyZW50QmdtLm5hbWUpIHtcbiAgICAgICAgICB0aGlzLm5leHRCZ20gPSBCZ21CdWZmZXIuYXJyYW5nZU5ld0JnbSh0aGlzLm5leHRCZ20sIEF1ZGlvTWFuYWdlci5fY3VycmVudEJnbSk7XG5cbiAgICAgICAgICB2YXIgcG9zaXRpb24gPSBCZ21CdWZmZXIuZ2V0QnVmZmVyc1Bvc2l0aW9uQnlJbmRleCgwKTtcbiAgICAgICAgICB0aGlzLm5leHRCZ20ucG9zID0gcG9zaXRpb247XG4gICAgICAgICAgQXVkaW9NYW5hZ2VyLl9jdXJyZW50QmdtLnBvcyA9IHBvc2l0aW9uO1xuXG4gICAgICAgICAgQmdtQnVmZmVyLnVuc2hpZnRCdWZmZXIodGhpcy5uZXh0QmdtKTtcbiAgICAgICAgICBCZ21CdWZmZXIucmVkdWNlQnVmZmVycygyKTtcbiAgICAgICAgICBCZ21CdWZmZXIucGxheUFsbEJ1ZmZlcnMoKTtcblxuICAgICAgICAgIEJnbUJ1ZmZlci5mYWRlSW5CdWZmZXJCeUluZGV4KDAsIHRoaXMuZHVyYXRpb25TZWMgKiAwLjc1KTtcbiAgICAgICAgICBCZ21CdWZmZXIuZmFkZU91dEJ1ZmZlckJ5SW5kZXgoMSwgdGhpcy5kdXJhdGlvblNlYyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIEJnbUJ1ZmZlci51bnNoaWZ0QnVmZmVyKHRoaXMubmV4dEJnbSk7XG4gICAgICAgIEJnbUJ1ZmZlci5yZWR1Y2VCdWZmZXJzKDIpO1xuICAgICAgICBCZ21CdWZmZXIucGxheUFsbEJ1ZmZlcnMoKTtcbiAgICAgICAgQmdtQnVmZmVyLmZhZGVJbkJ1ZmZlckJ5SW5kZXgoMCwgdGhpcy5kdXJhdGlvblNlYyAqIDAuNzUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKiDjg5Xjgqfjg7zjg4nmmYLplpMocynjgpLoqK3lrpogKi9cbiAgICBzZXREdXJhdGlvbihkdXJhdGlvblNlYykge1xuICAgICAgdGhpcy5kdXJhdGlvblNlYyA9IE51bWJlcihkdXJhdGlvblNlYyk7XG4gICAgfVxuXG4gICAgLyoqIOODleOCp+ODvOODieaZgumWkyhzKeOCkuODh+ODleOCqeODq+ODiOOBq+ODquOCu+ODg+ODiCAqL1xuICAgIHJlc2V0RHVyYXRpb24oKSB7XG4gICAgICB0aGlzLmR1cmF0aW9uU2VjID0gdGhpcy5kZWZhdWx0RHVyYXRpb25TZWM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qyh44Gr5rWB44GZQkdN44KS44G+44Go44KB44Gm6Kit5a6aXG4gICAgICpcbiAgICAgKiBuYW1lLHZvbHVtZSxwYW4scGl0Y2gscG9zIOOBrumghuOBp+OBvuOBqOOCgeOBpuabuOOBj1xuICAgICAqIOOCq+ODs+ODnuOBruOBguOBqOOBq+epuueZveaWh+Wtl+OCkue9ruOBi+OBquOBhOOBk+OBqFxuICAgICAqXG4gICAgICogQHBhcmFtIF9hcmdzOiBTdHJpbmdcbiAgICAgKi9cbiAgICBzZXRBbGwoX2FyZ3MpIHtcbiAgICAgIHZhciBhcmdzQXJyYXkgPSBfYXJncy5zcGxpdChcIixcIik7XG5cbiAgICAgIHZhciBuYW1lICAgPSAoYXJnc0FycmF5WzBdICE9PSB1bmRlZmluZWQgJiYgYXJnc0FycmF5WzBdICE9PSBcIlwiKSA/IFN0cmluZyhhcmdzQXJyYXlbMF0pIDogbnVsbDtcbiAgICAgIHZhciB2b2x1bWUgPSAoYXJnc0FycmF5WzFdICE9PSB1bmRlZmluZWQgJiYgYXJnc0FycmF5WzFdICE9PSBcIlwiKSA/IE51bWJlcihhcmdzQXJyYXlbMV0pIDogbnVsbDtcbiAgICAgIHZhciBwYW4gICAgPSAoYXJnc0FycmF5WzJdICE9PSB1bmRlZmluZWQgJiYgYXJnc0FycmF5WzJdICE9PSBcIlwiKSA/IE51bWJlcihhcmdzQXJyYXlbMl0pIDogbnVsbDtcbiAgICAgIHZhciBwaXRjaCAgPSAoYXJnc0FycmF5WzNdICE9PSB1bmRlZmluZWQgJiYgYXJnc0FycmF5WzNdICE9PSBcIlwiKSA/IE51bWJlcihhcmdzQXJyYXlbM10pIDogbnVsbDtcbiAgICAgIHZhciBwb3MgICAgPSAoYXJnc0FycmF5WzRdICE9PSB1bmRlZmluZWQgJiYgYXJnc0FycmF5WzRdICE9PSBcIlwiKSA/IE51bWJlcihhcmdzQXJyYXlbNF0pIDogbnVsbDtcblxuICAgICAgdGhpcy5uZXh0QmdtID0ge1xuICAgICAgICBuYW1lICA6IG5hbWUsXG4gICAgICAgIHZvbHVtZTogdm9sdW1lLFxuICAgICAgICBwYW4gICA6IHBhbixcbiAgICAgICAgcGl0Y2ggOiBwaXRjaCxcbiAgICAgICAgcG9zICAgOiBwb3MsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOODl+ODqeOCsOOCpOODs+OCs+ODnuODs+ODieOCkueZu+mMslxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0UGx1Z2luQ29tbWFuZHMoKSB7XG4gICAgICB2YXIgY3Jvc3NGYWRlQmdtQ2xhc3MgPSBuZXcgQ3Jvc3NGYWRlQmdtKCk7XG5cbiAgICAgIHZhciBfR2FtZV9JbnRlcnByZXRlcl9wbHVnaW5Db21tYW5kID1cbiAgICAgICAgR2FtZV9JbnRlcnByZXRlci5wcm90b3R5cGUucGx1Z2luQ29tbWFuZDtcblxuICAgICAgR2FtZV9JbnRlcnByZXRlci5wcm90b3R5cGUucGx1Z2luQ29tbWFuZCA9IGZ1bmN0aW9uKGNvbW1hbmQsIGFyZ3MpIHtcbiAgICAgICAgX0dhbWVfSW50ZXJwcmV0ZXJfcGx1Z2luQ29tbWFuZC5jYWxsKHRoaXMsIGNvbW1hbmQsIGFyZ3MpO1xuICAgICAgICBpZiAoY29tbWFuZCA9PT0gXCJDcm9zc0ZhZGVCZ21cIikge1xuICAgICAgICAgIHN3aXRjaCAoYXJnc1swXSkge1xuICAgICAgICAgICAgY2FzZSBcInNldFwiOlxuICAgICAgICAgICAgICBjcm9zc0ZhZGVCZ21DbGFzcy5zZXRBbGwoYXJnc1sxXSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInN0YXJ0XCI6XG4gICAgICAgICAgICAgIGNyb3NzRmFkZUJnbUNsYXNzLnN0YXJ0Q3Jvc3NGYWRlKCk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImR1cmF0aW9uU2VjXCI6XG4gICAgICAgICAgICAgIGNyb3NzRmFkZUJnbUNsYXNzLnNldER1cmF0aW9uKGFyZ3NbMV0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJyZXNldER1cmF0aW9uXCI6XG4gICAgICAgICAgICAgIGNyb3NzRmFkZUJnbUNsYXNzLnJlc2V0RHVyYXRpb24oKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIENyb3NzRmFkZUJnbS5pbml0UGx1Z2luQ29tbWFuZHMoKTtcblxufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
