$(function () {
    if ($('textarea#ta').length) {
        CKEDITOR.replace('ta');
    } 

    $('a.confirmDeletion').on('click', function () {
        if (!confirm('Do you want delete???'))
        return false;
    });
});

if ($("[data-fancybox]").length) {
    $("[data-fancybox]").fancybox();
}

