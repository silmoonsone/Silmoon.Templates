﻿$(document).ready(function () {
    // 主题检测和初始化
    initTheme();

    // 监听系统主题变化
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
            if (!localStorage.getItem('theme')) {
                // 只有在自动模式下才跟随系统主题变化
                updateTheme('auto');
            }
        });
    }

    // 菜单切换
    $('#toggle-menu').on('click', function (e) {
        e.stopPropagation();
        $('#menu').toggleClass('open');
    });

    // 点击菜单项时关闭菜单
    $('#menu a').on('click', function () {
        $('#menu').removeClass('open');
    });

    // 点击页面其他地方关闭菜单
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#menu, #toggle-menu').length) {
            $('#menu').removeClass('open');
        }
    });

    // 卡片点击效果
    $('.card').on('click', function () {
        $(this).addClass('active').siblings().removeClass('active');
    });

    // 添加页面加载动画
    $('.content-wrapper').hide().fadeIn(500);
});

// 主题初始化
function initTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
        updateTheme('light');
    } else if (savedTheme === 'dark') {
        updateTheme('dark');
    } else {
        updateTheme('auto');
    }

    // 更新按钮状态
    updateThemeButtonState();
}

// 更新主题
function updateTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'auto') {
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // 保存主题设置
    if (theme === 'auto') {
        localStorage.removeItem('theme');
    } else {
        localStorage.setItem('theme', theme);
    }
}

// 更新主题按钮状态
function updateThemeButtonState() {
    const currentTheme = localStorage.getItem('theme') || 'auto';
    $('.theme-btn, .theme-menu-btn').removeClass('active');
    $(`.theme-btn[data-theme="${currentTheme}"]`).addClass('active');
    $(`.theme-menu-btn[data-theme="${currentTheme}"]`).addClass('active');
}

// 主题按钮点击事件
$(document).on('click', '.theme-btn, .theme-menu-btn', function () {
    const theme = $(this).data('theme');
    updateTheme(theme);
    updateThemeButtonState();

    // 添加按钮点击动画效果
    $(this).addClass('clicked');
    setTimeout(() => {
        $(this).removeClass('clicked');
    }, 200);
});
