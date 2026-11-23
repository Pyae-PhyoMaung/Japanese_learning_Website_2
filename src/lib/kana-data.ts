/* Kana tables — extracted verbatim from the original hiragana.html / katakana.html ROWS data. */
export const KANA_ROWS: Record<string, string[][]> = {"hiragana": [["あ行", "あいうえお", "a i u e o"], ["か行", "かきくけこ", "ka ki ku ke ko"], ["さ行", "さしすせそ", "sa shi su se so"], ["た行", "たちつてと", "ta chi tsu te to"], ["な行", "なにぬねの", "na ni nu ne no"], ["は行", "はひふへほ", "ha hi fu he ho"], ["ま行", "まみむめも", "ma mi mu me mo"], ["や行", "やゆよ", "ya yu yo"], ["ら行", "らりるれろ", "ra ri ru re ro"], ["わ行", "わをん", "wa wo n"], ["が行", "がぎぐげご", "ga gi gu ge go"], ["ざ行", "ざじずぜぞ", "za ji zu ze zo"], ["だ行", "だぢづでど", "da ji zu de do"], ["ば行", "ばびぶべぼ", "ba bi bu be bo"], ["ぱ行", "ぱぴぷぺぽ", "pa pi pu pe po"], ["拗音", "きゃきゅきょしゃしゅしょちゃちゅちょにゃにゅにょひゃひゅひょみゃみゅみょりゃりゅりょぎゃぎゅぎょじゃじゅじょびゃびゅびょぴゃぴゅぴょ", "kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo gya gyu gyo ja ju jo bya byu byo pya pyu pyo"]], "katakana": [["ア行", "アイウエオ", "a i u e o"], ["カ行", "カキクケコ", "ka ki ku ke ko"], ["サ行", "サシスセソ", "sa shi su se so"], ["タ行", "タチツテト", "ta chi tsu te to"], ["ナ行", "ナニヌネノ", "na ni nu ne no"], ["ハ行", "ハヒフヘホ", "ha hi fu he ho"], ["マ行", "マミムメモ", "ma mi mu me mo"], ["ヤ行", "ヤユヨ", "ya yu yo"], ["ラ行", "ラリルレロ", "ra ri ru re ro"], ["ワ行", "ワヲン", "wa wo n"], ["ガ行", "ガギグゲゴ", "ga gi gu ge go"], ["ザ行", "ザジズゼゾ", "za ji zu ze zo"], ["ダ行", "ダヂヅデド", "da ji zu de do"], ["バ行", "バビブベボ", "ba bi bu be bo"], ["パ行", "パピプペポ", "pa pi pu pe po"], ["拗音", "キャキュキョシャシュショチャチュチョニャニュニョヒャヒュヒョミャミュミョリャリュリョギャギュギョジャジュジョビャビュビョピャピュピョ", "kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo gya gyu gyo ja ju jo bya byu byo pya pyu pyo"]]};

/* Split a row's kana string into display units. Combined sounds (拗音 digraphs
   like きゃ / キュ) are TWO characters with ONE romaji, so the small combining
   char must stay glued to its base — otherwise きゃきゅきょ pairs き↔kya,
   ゃ↔kyu… and every yōon card is wrong. Same grouping the original site used. */
const SMALL_KANA = 'ゃゅょャュョ';
export function kanaUnits(s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    if (out.length && SMALL_KANA.indexOf(ch) >= 0) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
