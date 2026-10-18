<?php
// GitHub -> Hostra avtomatik yangilash.
// GitHub (webhook) "yangilanish bor" deb shu faylni chaqiradi. Fayl repozitoriyni yuklab olib, sayt papkasiga joylaydi.

// ======== FAQAT SHU 3 TA QATORNI O'ZGARTIRING ========
$REPO   = 'Shukurov2009/About-Me';   // masalan: ali123/portfolio
$SECRET = 'S@DFT_$@IVKJHBTbvhjbhg!';  // GitHub webhook'dagi Secret bilan aynan bir xil
$TOKEN  = '';                                  // repo ochiq (public) bo'lsa, bo'sh qoldiring
// =======================================================

// Hostra'ga joylanmaydigan narsalar (ular faqat Vercel uchun)
$SKIP = ['api', 'node_modules', 'vercel.json', 'README-SETUP.txt', 'deploy.php'];

header('Content-Type: text/plain; charset=utf-8');
ignore_user_abort(true);
set_time_limit(180);

if ($SECRET === '' || $SECRET === 'O_ZINGIZ_UYLAB_TOPGAN_UZUN_PAROL') exit("Avval deploy.php ichidagi SECRET ni o'zgartiring.\n");

// Faqat GitHub (to'g'ri imzo bilan) yoki to'g'ri ?key= bilan kelgan so'rov qabul qilinadi
$body = file_get_contents('php://input');
$sig  = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$ok = ($sig !== '' && hash_equals('sha256=' . hash_hmac('sha256', $body, $SECRET), $sig))
   || hash_equals($SECRET, (string)($_GET['key'] ?? ''));
if (!$ok) { http_response_code(403); exit("forbidden\n"); }
if (($_SERVER['HTTP_X_GITHUB_EVENT'] ?? '') === 'ping') exit("pong\n");
if (!class_exists('ZipArchive')) exit("XATO: PHP'da zip kengaytmasi yoqilmagan (Boshqarish -> Sozlamalar -> PHP).\n");
if (!function_exists('curl_init')) exit("XATO: PHP'da curl kengaytmasi yoqilmagan.\n");

// Ketma-ket kelgan yangilanishlar navbat bilan bajariladi
$lock = fopen(sys_get_temp_dir() . '/hostra-deploy.lock', 'c');
flock($lock, LOCK_EX);

// 1) Repozitoriyni zip qilib yuklab olamiz
$tmp = tempnam(sys_get_temp_dir(), 'gh');
$fp  = fopen($tmp, 'w');
$h = ['User-Agent: hostra-deploy', 'Accept: application/vnd.github+json'];
if ($TOKEN !== '') $h[] = 'Authorization: Bearer ' . $TOKEN;
$ch = curl_init("https://api.github.com/repos/$REPO/zipball");
curl_setopt_array($ch, [CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 150, CURLOPT_HTTPHEADER => $h]);
curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
fclose($fp);
if ($code !== 200) { @unlink($tmp); exit("XATO: GitHub javobi $code. REPO nomi yoki TOKEN noto'g'ri bo'lishi mumkin.\n"); }

// 2) Fayllarni shu papkaga ochamiz
$zip = new ZipArchive;
if ($zip->open($tmp) !== true) { @unlink($tmp); exit("XATO: zip ochilmadi.\n"); }
$n = 0;
$music = [];
for ($i = 0; $i < $zip->numFiles; $i++) {
  $name = $zip->getNameIndex($i);
  $rel  = substr($name, strpos($name, '/') + 1);           // birinchi papka (repo-nomi-xxxx/) ni olib tashlaymiz
  if ($rel === '' || substr($rel, -1) === '/') continue;
  $parts = explode('/', $rel);
  if (in_array($parts[0], $SKIP, true) || str_starts_with($parts[0], '.git') || in_array('..', $parts, true)) continue;
  if ($parts[0] === 'music') $music[$rel] = 1;
  $dest = __DIR__ . '/' . $rel;
  if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755, true);
  $in = $zip->getStream($name);
  if (!$in) continue;
  $out = fopen($dest, 'w');
  stream_copy_to_stream($in, $out);
  fclose($in);
  fclose($out);
  $n++;
}
$zip->close();
@unlink($tmp);

// 3) Botda o'chirilgan qo'shiqlar Hostra'dan ham o'chadi
$del = 0;
if (is_dir(__DIR__ . '/music')) {
  foreach (glob(__DIR__ . '/music/*') as $f) {
    if (is_file($f) && !isset($music['music/' . basename($f)])) { unlink($f); $del++; }
  }
}
echo "OK: $n ta fayl yangilandi, $del ta eski qo'shiq o'chirildi.\n";
