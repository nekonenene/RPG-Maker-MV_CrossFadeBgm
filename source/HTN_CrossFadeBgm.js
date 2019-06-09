// --------------------------------------------------------------------------
//
// CrossFadeBgm
//
// Copyright (c) 2016 hatonekoe
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
//
// 2019/06/10 ver0.3.1 「BGMの演奏」で、別パラメーターの同曲が再生されない不具合を修正
// 2019/06/10 ver0.3.0 startコマンドでオプションの指定ができるように
// 2017/04/18 ver0.2.1 setDurationコマンドが動作していなかったので修正、startコマンドにオプション追加
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
 * 【もっともシンプルな使い方】
 *   プラグインコマンドで「CrossFadeBgm start _,Ship1,90,0,100」と書いたイベントを置いてみてください
 *
 * 【プラグインコマンド詳細】
 *   CrossFadeBgm set bgm_name          # 次に流す曲を指定します
 *   CrossFadeBgm set bgm_name,60,0,100 # 曲名のほかに音量などの指定が可能です。詳細は下の【setコマンドの詳細】をご覧ください
 *   CrossFadeBgm start                 # クロスフェードを開始します
 *   CrossFadeBgm start 2.5             # フェード時間（この例では2.5秒）を指定しつつクロスフェードを開始します。デフォルトのフェード時間は変わりません
 *   CrossFadeBgm start 2.5,bgm_name,90 # フェード時間の後ろにsetコマンドで扱うオプションを指定しつつ、クロスフェードを開始します
 *   CrossFadeBgm setDuration 8.41      # デフォルトのフェード時間を新たに定義します（この例では8.41秒）
 *   CrossFadeBgm resetDuration         # デフォルトのフェード時間を、プラグイン管理ウィンドウで指定している値に戻します
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
 *   CrossFadeBgm set Ship1,,,100    # 途中の値を省略することが可能です。ただし、BGM名は最低限指定してください
 *                                   # 省略された音量などの値は、現在流れているBGMの値が使われます
 *   CrossFadeBgm set Ship1,_,_,100  # カンマだけが並ぶのは見づらいなと感じる場合は、アンダーバーを使うのがよいかもしれません
 *
 * 【注意事項】
 *   ツクールでの「デプロイメント」でゲームを出力するとき、「未使用ファイルを含まない」のチェックをONにした場合、
 *   ツクールはプラグインコマンドでどのBGMが使われてるのかまでは見ませんので、
 *   本当は使っているのに、使ってないとみなされて必要なBGMファイルが出力されない場合があります。
 *
 *   これではそのBGMを再生しようとしたときにエラーが発生してしまいます。
 *
 *   対策としては、「未使用ファイルを含まない」のチェックをOFFでデプロイメントするか、
 *   ダミーの（ゲームでは実際通らない）マップを用意して、出力されないBGMを演奏するイベントをそこに置くとよいかと思います。
 *
 * @param Default Fade Duration Sec
 * @desc デフォルトのフェード時間（秒）
 * @default 2.0
 *
 */

(function() {
  'use strict';

  const pluginName = 'HTN_CrossFadeBgm';

  /**
   * bgm は Array クラス
   * buffer は WebAudio クラス、もしくは Html5Audio クラス
   */
  class BgmBuffer {

    constructor() {
      BgmBuffer.extendAudioManager();
      BgmBuffer.setIndexForCurrentBgm(0);
    }

    /**
     * ツクールの AudioManager クラスを拡張
     *
     * @FIXME 他のプラグインが playBgm() とか拡張するとこのプラグインが動かなくなる
     */
    static extendAudioManager() {
      AudioManager._bgmArray = [];
      AudioManager._bgmBufferArray = [];

      /** BGM の再生 */
      AudioManager.playBgm = function(bgm, pos) {
        if (AudioManager.isCurrentBgm(bgm)) {
          AudioManager.updateBgmParameters(bgm);
        } else {
          AudioManager.stopBgm();
          if (bgm.name !== null) {
            if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
              AudioManager.playEncryptedBgm(bgm, pos);
            }
            else {
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
        AudioManager.updateCurrentBgm(bgm, pos);
      };

      /** playEncryptedBgm から呼ばれる。暗号化されたBGMを再生するためのバッファを作成 */
      AudioManager.createDecryptBuffer = function(url, bgm, pos) {
        AudioManager._blobUrl = url;
        bgm.pos = pos;
        BgmBuffer.pushBuffer(bgm);
        // AudioManager._bgmBuffer = AudioManager.createBuffer('bgm', bgm.name);
        AudioManager.updateBgmParameters(bgm);
        if (!AudioManager._meBuffer) {
          // AudioManager._bgmBuffer.play(true, pos || 0);
          BgmBuffer.playAllBuffers();
        }
        AudioManager.updateCurrentBgm(bgm, pos);
      };

      /**
       * BGM の再生停止
       * バッファー配列は空にする
       */
      AudioManager.stopBgm = function() {
        AudioManager._bgmBufferArray.forEach(function(buffer) {
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
    static setIndexForCurrentBgm(_indexForCurrentBgm) {
      const indexForCurrentBgm = parseInt(_indexForCurrentBgm);
      const length = BgmBuffer.countBuffers();

      if (indexForCurrentBgm === 0 || (0 <= indexForCurrentBgm && indexForCurrentBgm < length)) {
        Object.defineProperty(AudioManager, '_bgmBuffer', {
          get: function() {
            return AudioManager._bgmBufferArray[indexForCurrentBgm];
          },
          set: function(_buffer) {
            AudioManager._bgmBufferArray[indexForCurrentBgm] = _buffer;
          },
          configurable: true
        });

        Object.defineProperty(AudioManager, '_currentBgm', {
          get: function() {
            return AudioManager._bgmArray[indexForCurrentBgm];
          },
          set: function(_bgm) {
            AudioManager._bgmArray[indexForCurrentBgm] = _bgm;
          },
          configurable: true
        });
      } else {
        console.warn('!!WARN!! index number is not valid @ setIndexForCurrentBgm');
      }
    }

    /**
     * バッファーを後ろに足す
     *
     * @param _newBgm: Array 例 {name: 'bgm_title', volume: 90, pitch: 100, pan: 0, pos: 0}
     */
    static pushBuffer(_newBgm) {
      // 未定義の部分は現在の曲の値をセットしてあげる
      const newBgm = BgmBuffer.arrangeNewBgm(_newBgm, AudioManager._currentBgm);

      AudioManager._bgmArray.push(newBgm);

      // 無名BGMも曲として扱うが、バッファーとしてはnull
      if (newBgm.name === '') {
        AudioManager._bgmBufferArray.push(null);
      } else if (newBgm.name !== null) {
        // 暗号化されたオーディオファイルの場合 @TODO 通らないっぽいので消してもいいかも
        if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
          const ext = AudioManager.audioFileExt();
          let url = AudioManager._path + 'bgm/' + encodeURIComponent(bgm.name) + ext;
          url = Decrypter.extToEncryptExt(url);
          Decrypter.decryptHTML5Audio(url, bgm, bgm.pos);
          AudioManager._blobUrl = url;
        }
        AudioManager._bgmBufferArray.push(AudioManager.createBuffer('bgm', newBgm.name));
      } else {
        console.warn('!!WARN!! next bgm name is null @ pushBuffer');
        AudioManager._bgmBufferArray.push(null); // _bgmArray の個数と整合性を保つため挿入
      }
      // console.log('Bufferの個数: ' + BgmBuffer.countBuffers()); // @TODO: あとで消す
    }

    /**
     * バッファーを先頭に足す
     *
     * @param _newBgm: Array 例 {name: 'bgm_title', volume: 90, pitch: 100, pan: 0, pos: 0}
     */
    static unshiftBuffer(_newBgm) {
      // 未定義の部分は現在の曲の値をセットしてあげる
      const newBgm = BgmBuffer.arrangeNewBgm(_newBgm, AudioManager._currentBgm);

      AudioManager._bgmArray.unshift(newBgm);

      // 無名BGMも曲として扱うが、バッファーとしてはnull
      if (newBgm.name === '') {
        AudioManager._bgmBufferArray.unshift(null);
      } else if (newBgm.name !== null) {
        // 暗号化されたオーディオファイルの場合 @TODO 通らないっぽいので消してもいいかも
        if (Decrypter.hasEncryptedAudio && AudioManager.shouldUseHtml5Audio()) {
          const ext = AudioManager.audioFileExt();
          let url = AudioManager._path + 'bgm/' + encodeURIComponent(bgm.name) + ext;
          url = Decrypter.extToEncryptExt(url);
          Decrypter.decryptHTML5Audio(url, bgm, bgm.pos);
          AudioManager._blobUrl = url;
        }

        AudioManager._bgmBufferArray.unshift(AudioManager.createBuffer('bgm', newBgm.name));
      } else {
        console.warn('!!WARN!! next bgm name is null @ unshiftBuffer');
        AudioManager._bgmBufferArray.unshift(null); // _bgmArray の個数と整合性を保つため挿入
      }
      // console.log('Bufferの個数: ' + BgmBuffer.countBuffers()); // @TODO: あとで消す
    }

    /**
     * バッファーの個数を数える
     *
     * @return Number
     */
    static countBuffers() {
      return AudioManager._bgmBufferArray.length;
    }

    /**
     * すべてのバッファーの再生を止める
     */
    static muteAllBuffers() {
      AudioManager._bgmBufferArray.forEach(function(buffer) {
        if (buffer !== null) {
          buffer.stop();
        }
      });
    }

    /**
     * すべてのバッファーを再生する
     */
    static playAllBuffers() {
      AudioManager._bgmBufferArray.forEach(function(buffer, index) {
        if (buffer !== null) {
          const audioParameter = AudioManager._bgmArray[index];

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
    static playBufferByIndex(_index) {
      const index = parseInt(_index);
      const length = BgmBuffer.countBuffers();

      if (0 <= index && index < length) {
        const buffer = AudioManager._bgmBufferArray[index];

        if (buffer !== null) {
          const audioParameter = AudioManager._bgmArray[index];

          if (audioParameter !== null) {
            AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, audioParameter);
            buffer.play(true, audioParameter.pos || 0);
          }
        }
      } else {
        console.warn('!!WARN!! index number is not valid @ playBufferByIndex');
      }
    }

    /**
     * バッファーを指定個数に減らす
     *
     * @param quantity: Number この数に buffer の個数を減らす
     */
    static reduceBuffers(_quantity) {
      const quantity = parseInt(_quantity);
      const length = BgmBuffer.countBuffers();

      for (let i = quantity; i < length; ++i) {
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
    static removeBufferByIndex(_index) {
      const index = parseInt(_index);
      const length = BgmBuffer.countBuffers();

      const newBgmArray = [];
      const newBgmBufferArray = [];

      if (0 <= index && index < length) {
        for (let i = 0; i < length; ++i) {
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
        console.warn('!!WARN!! index number is not valid @ removeBufferByIndex');
      }
    }

    /**
     * index(0~)を指定し、対象のバッファーをアップデート
     *
     * @param _index: Number アップデート対象とするバッファーの、バッファー配列におけるインデックス(0~)
     * @param _newBgm: Array 例 {name: 'bgm_title', volume: 90, pitch: 100, pan: 0, pos: 0}
     */
    static updateBufferByIndex(_index, _newBgm) {
      const index = parseInt(_index);
      const length = BgmBuffer.countBuffers();

      if (0 <= index && index < length) {
        const buffer = AudioManager._bgmBufferArray[index];
        const currentBgm = AudioManager._bgmArray[index];
        const newBgm = BgmBuffer.arrangeNewBgm(_newBgm, currentBgm);

        AudioManager._bgmArray[index] = newBgm;
        AudioManager.updateBufferParameters(buffer, AudioManager._bgmVolume, newBgm);
      } else {
        console.warn('!!WARN!! index number is not valid @ updateBufferByIndex');
      }
    }

    /**
     * BGM名をもとにバッファー一覧を検索し、対象のバッファーをアップデート
     *
     * @param _bgmName: String 更新したい BGM名
     * @param _newBgm: Array 例 {name: 'bgm_title', volume: 90, pitch: 100, pan: 0, pos: 0}
     */
    static updateBufferByBgmName(_bgmName, _newBgm) {
      const bgmName = String(_bgmName);

      AudioManager._bgmArray.forEach(function(bgm, index) {
        if (bgm.name === bgmName) {
          const buffer = AudioManager._bgmBufferArray[index];
          const currentBgm = AudioManager._bgmArray[index];
          const newBgm = BgmBuffer.arrangeNewBgm(_newBgm, currentBgm);

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
    static arrangeNewBgm(_newBgm, _currentBgm) {
      const newBgm = _newBgm;

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
    static fadeInBufferByIndex(_index, _fadeDurationSec) {
      const index = parseInt(_index);
      const fadeDurationSec = Number(_fadeDurationSec);
      const length = BgmBuffer.countBuffers();

      if (0 <= index && index < length) {
        const buffer = AudioManager._bgmBufferArray[index];

        if (buffer !== null) {
          buffer.fadeIn(fadeDurationSec);
        }
      } else {
        console.warn('!!WARN!! index number is not valid @ fadeInBufferByIndex');
      }
    }

    /**
     * index(0~)を指定し、対象のバッファーをフェードアウト
     *
     * @param _index: Number アップデート対象とするバッファーの、バッファー配列におけるインデックス(0~)
     * @param _fadeDurationSec: Number フェードアウトにかける時間（秒）
     */
    static fadeOutBufferByIndex(_index, _fadeDurationSec) {
      const index = parseInt(_index);
      const fadeDurationSec = Number(_fadeDurationSec);
      const length = BgmBuffer.countBuffers();

      if (0 <= index && index < length) {
        const buffer = AudioManager._bgmBufferArray[index];

        if (buffer !== null) {
          buffer.fadeOut(fadeDurationSec);
        }
      } else {
        console.warn('!!WARN!! index number is not valid @ fadeOutBufferByIndex');
      }
    }

    static getBuffersPositionByIndex(_index) {
      const index = parseInt(_index);
      const length = BgmBuffer.countBuffers();

      if (0 <= index && index < length) {
        const buffer = AudioManager._bgmBufferArray[index];

        if (buffer !== null) {
          return (buffer.seek() || 0);
        } else {
          return null;
        }
      } else {
        console.warn('!!WARN!! index number is not valid @ fadeInBufferByIndex');
      }
    }
  }

  class CrossFadeBgm {
    constructor() {
      // プラグインパラメーターからデフォルトフェード時間を設定
      const parameters = PluginManager.parameters(pluginName);
      this._defaultDurationSec = Number(parameters['Default Fade Duration Sec']);
      this.durationSec = this.defaultDurationSec;

      this.bgmBuffer = new BgmBuffer();

      this.nextBgm = {
        name: '',
      };
    }

    /** defaultDurationSec を取得、set はしない */
    get defaultDurationSec() {
      return this._defaultDurationSec;
    }

    /** クロスフェードを開始 */
    startCrossFade(_options) {
      let durationSec = this.durationSec;

      if (_options != null) {
        const optionsArray = _options.split(',');
        const opt1 = optionsArray.shift();
        if (!isNaN(parseFloat(opt1)) && Number(opt1) >= 0) {
          durationSec = Number(opt1);
        }

        if (optionsArray.length > 0) {
          this.setAll(optionsArray.join(','));
        }
      }

      if (AudioManager._currentBgm !== null) {
        if (this.nextBgm.name !== AudioManager._currentBgm.name) {
          this.nextBgm = BgmBuffer.arrangeNewBgm(this.nextBgm, AudioManager._currentBgm);

          const position = BgmBuffer.getBuffersPositionByIndex(0);
          this.nextBgm.pos = position;
          AudioManager._currentBgm.pos = position;

          BgmBuffer.unshiftBuffer(this.nextBgm);
          BgmBuffer.reduceBuffers(2);
          BgmBuffer.playAllBuffers();

          BgmBuffer.fadeInBufferByIndex(0, durationSec * 0.75);
          BgmBuffer.fadeOutBufferByIndex(1, durationSec);
        }
      } else {
        BgmBuffer.unshiftBuffer(this.nextBgm);
        BgmBuffer.reduceBuffers(2);
        BgmBuffer.playAllBuffers();
        BgmBuffer.fadeInBufferByIndex(0, durationSec * 0.75);
      }
    }

    /** フェード時間(s)を設定 */
    setDuration(_durationSec) {
      if (Number(_durationSec) > 0) {
        this.durationSec = Number(_durationSec);
      }
    }

    /** フェード時間(s)をデフォルトにリセット */
    resetDuration() {
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
    setAll(_args) {
      const argsArray = _args.split(',');

      const name   = (argsArray[0] == null || argsArray[0] === '') ? null : String(argsArray[0]);
      const volume = isNaN(parseFloat(argsArray[1])) ? null : Number(argsArray[1]);
      const pan    = isNaN(parseFloat(argsArray[2])) ? null : Number(argsArray[2]);
      const pitch  = isNaN(parseFloat(argsArray[3])) ? null : Number(argsArray[3]);
      const pos    = isNaN(parseFloat(argsArray[4])) ? null : Number(argsArray[4]);

      this.nextBgm = {
        name  : name,
        volume: volume,
        pan   : pan,
        pitch : pitch,
        pos   : pos,
      };
    }

    /**
     * プラグインコマンドを登録
     */
    static initPluginCommands() {
      const crossFadeBgmClass = new CrossFadeBgm();

      const _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;

      Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'CrossFadeBgm') {
          switch (args[0]) {
            case 'set':
              crossFadeBgmClass.setAll(args[1]);
              break;
            case 'start':
              crossFadeBgmClass.startCrossFade(args[1]);
              break;
            case 'setDuration':
              crossFadeBgmClass.setDuration(args[1]);
              break;
            case 'resetDuration':
              crossFadeBgmClass.resetDuration();
              break;
          }
        }
      };
    }
  }

  CrossFadeBgm.initPluginCommands();

})();
