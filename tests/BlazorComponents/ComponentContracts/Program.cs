using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using Silmoon.AspNetCore.FullFunctionTemplate.Components;

var contracts = new (string Name, Func<Task> Run)[]
{
    ("TreePicker dynamic Disabled", TreePickerDisabledContract),
    ("EnumSelect dynamic Disabled", EnumSelectDisabledContract),
    ("EnumSelect display metadata and undefined values", EnumSelectDisplayContract),
    ("EnumSelect rendered disposal releases EditContext subscriptions", EnumSelectDisposalContract),
    ("DropdownSelect value binding and disabled selection", DropdownSelectValueContract),
    ("DropdownSelect SSR links, direction parameters and disabled fallback", DropdownSelectLinkContract),
    ("DropdownMenu recursive panels, SSR links and width parameters", DropdownMenuRenderingContract),
    ("DropdownMenu callbacks and dynamic disabled state", DropdownMenuSelectionContract),
    ("ContentCard optional content, heading semantics and layout parameters", ContentCardRenderingContract),
    ("ConfirmDialog component-owned module loading", ConfirmDialogLoadingContract),
    ("TimeInput end-of-day parsing and formatting", TimeInputEndOfDayContract)
};
var failures = 0;
foreach (var contract in contracts)
{
    try
    {
        await contract.Run();
        Console.WriteLine($"PASS {contract.Name}");
    }
    catch (Exception exception)
    {
        failures++;
        Console.Error.WriteLine($"FAIL {contract.Name}: {exception.GetBaseException()}");
    }
}
Console.WriteLine($"{contracts.Length - failures}/{contracts.Length} component contracts passed.");
return failures == 0 ? 0 : 1;

static async Task TreePickerDisabledContract()
{
    var picker = new TreePicker();
    var callbacks = new List<string>();
    Set(picker, nameof(TreePicker.Value), "/documents/");
    Set(picker, nameof(TreePicker.Folders), new[] { "/documents/", "/reports/" });
    Set(picker, nameof(TreePicker.AllowCreate), true);
    Set(picker, nameof(TreePicker.ValueChanged), EventCallback.Factory.Create<string>(callbacks, (Action<string>)callbacks.Add));
    await InvokeAsync(picker, "OnParametersSetAsync");
    Require(callbacks.Count == 0, "An already normalized initial value must not trigger ValueChanged.");

    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "The enabled picker must open.");
    Set(picker, nameof(TreePicker.Disabled), true);
    await InvokeAsync(picker, "OnParametersSetAsync");
    Require(!Get<bool>(picker, "IsOpen"), "Changing Disabled to true must close the open picker.");

    var expandedFolders = Get<HashSet<string>>(picker, "ExpandedFolders").ToHashSet(StringComparer.Ordinal);
    var additionalFolders = Get<HashSet<string>>(picker, "AdditionalFolders").ToHashSet(StringComparer.Ordinal);
    Invoke(picker, "TogglePicker");
    Require(!Get<bool>(picker, "IsOpen"), "A queued toggle must not reopen a disabled picker.");
    Invoke(picker, "ToggleFolder", "/reports/");
    Require(expandedFolders.SetEquals(Get<HashSet<string>>(picker, "ExpandedFolders")), "A disabled picker must not change expanded folders.");
    await InvokeAsync(picker, "SelectFolder", "/reports/");
    Require(picker.Value == "/documents/" && callbacks.Count == 0, "A queued selection must not change the disabled value or invoke ValueChanged.");
    Set(picker, "NewFolderName", "drafts");
    await InvokeAsync(picker, "CreateFolder");
    Require(picker.Value == "/documents/" && callbacks.Count == 0, "A queued create must not change the disabled value or invoke ValueChanged.");
    Require(additionalFolders.SetEquals(Get<HashSet<string>>(picker, "AdditionalFolders")), "A disabled create must not add a folder.");
    Require(expandedFolders.SetEquals(Get<HashSet<string>>(picker, "ExpandedFolders")), "Disabled selection and creation must not change expanded folders.");

    Set(picker, nameof(TreePicker.Disabled), false);
    await InvokeAsync(picker, "OnParametersSetAsync");
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "Re-enabling the picker must allow opening it again.");
    await InvokeAsync(picker, "SelectFolder", "/reports/");
    Require(picker.Value == "/reports/" && callbacks.SequenceEqual(new[] { "/reports/" }), "Re-enabling the picker must restore selection and emit exactly one ValueChanged.");
}

static Task EnumSelectDisabledContract()
{
    var picker = new EnumSelect<SampleMode>();
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "An enabled enum picker must open.");
    Set(picker, nameof(picker.Disabled), true);
    Invoke(picker, "OnParametersSet");
    Require(!Get<bool>(picker, "IsOpen"), "Disabling an open enum picker must close it.");
    Invoke(picker, "TogglePicker");
    Require(!Get<bool>(picker, "IsOpen"), "A queued toggle must not reopen a disabled enum picker.");
    Invoke(picker, "SelectOption", SampleMode.Grid);
    Require(picker.Value == default, "A queued selection must not change a disabled enum value.");
    Set(picker, nameof(picker.Disabled), false);
    Invoke(picker, "OnParametersSet");
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "Re-enabling an enum picker must restore opening.");
    return Task.CompletedTask;
}

static Task EnumSelectDisplayContract()
{
    var componentType = typeof(EnumSelect<SampleMode>);
    Require((string?)InvokeStatic(componentType, "GetDisplayName", SampleMode.List) == "列表", "Declared enum values must use DisplayAttribute.Name.");
    Require((string?)InvokeStatic(componentType, "GetDescription", SampleMode.List) == "按列表展示内容。", "Declared enum values must use DisplayAttribute.Description.");
    Require((string?)InvokeStatic(componentType, "GetDisplayName", SampleMode.Grid) == nameof(SampleMode.Grid), "A declared member without display metadata must retain its name.");
    Require((string?)InvokeStatic(componentType, "GetDescription", SampleMode.Grid) == string.Empty, "A declared member without display metadata must have an empty description.");
    foreach (var value in new[] { default(SampleMode), (SampleMode)42 })
    {
        Require((string?)InvokeStatic(componentType, "GetDisplayName", value) == value.ToString(), "An undefined enum value must display its text without throwing.");
        Require((string?)InvokeStatic(componentType, "GetDescription", value) == string.Empty, "An undefined enum value must have an empty description.");
    }
    return Task.CompletedTask;
}

static async Task DropdownSelectValueContract()
{
    var picker = new DropdownSelect<int>();
    var first = new DropdownSelectOption<int> { Value = 1, Text = "First" };
    var second = new DropdownSelectOption<int> { Value = 2, Text = "Second" };
    var unavailable = new DropdownSelectOption<int> { Value = 3, Text = "Unavailable", Disabled = true };
    var callbacks = new List<int>();
    Set(picker, nameof(picker.Items), new[] { first, second, unavailable });
    Set(picker, nameof(picker.Value), first.Value);
    Set(picker, nameof(picker.ValueChanged), EventCallback.Factory.Create<int>(callbacks, (Action<int>)(value =>
    {
        callbacks.Add(value);
        Set(picker, nameof(picker.Value), value);
    })));

    await InvokeAsync(picker, "SelectOption", first);
    Require(callbacks.Count == 0, "Selecting the bound value must not emit ValueChanged.");
    await InvokeAsync(picker, "SelectOption", second);
    Require(picker.Value == second.Value && callbacks.SequenceEqual(new[] { second.Value }), "Selection must update the parent binding exactly once.");
    await InvokeAsync(picker, "SelectOption", second);
    await InvokeAsync(picker, "SelectOption", unavailable);
    Set(picker, nameof(picker.Disabled), true);
    await InvokeAsync(picker, "SelectOption", first);
    Require(picker.Value == second.Value && callbacks.Count == 1, "Same-value, disabled-option and queued disabled-component selections must not update the binding.");
    Set(picker, nameof(picker.Disabled), false);
    await InvokeAsync(picker, "SelectOption", first);
    Require(picker.Value == first.Value && callbacks.SequenceEqual(new[] { second.Value, first.Value }), "Re-enabling must restore selection and the parent callback.");
}

static async Task DropdownSelectLinkContract()
{
    using var services = new ServiceCollection().AddSingleton<NavigationManager>(new TestNavigation()).BuildServiceProvider();
    await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
    var items = new[]
    {
        new DropdownSelectOption<string> { Value = "docs", Text = "Documentation", Href = "/docs" },
        new DropdownSelectOption<string> { Value = "restricted", Text = "Restricted", Href = "/restricted", Disabled = true }
    };
    async Task<string> Render(bool disabled, bool alignEnd = false, bool openUpward = false) => await renderer.Dispatcher.InvokeAsync(async () =>
    {
        var rendered = await renderer.RenderComponentAsync<DropdownSelect<string>>(ParameterView.FromDictionary(new Dictionary<string, object?>
        {
            [nameof(DropdownSelect<string>.Items)] = items,
            [nameof(DropdownSelect<string>.Value)] = "docs",
            [nameof(DropdownSelect<string>.Disabled)] = disabled,
            [nameof(DropdownSelect<string>.AlignEnd)] = alignEnd,
            [nameof(DropdownSelect<string>.OpenUpward)] = openUpward
        }));
        return rendered.ToHtmlString();
    });

    var enabledHtml = await Render(false);
    Require(enabledHtml.Contains("<silmoon-module src=\"https://example.test/nested-app/Components/DropdownSelect.razor.js?v=3\""), "SSR must declare its own module with the application base path, including on deep cshtml routes without a base tag.");
    Require(enabledHtml.Contains("<details ") && enabledHtml.Contains("<summary ") && enabledHtml.Contains("popover=\"manual\""), "SSR must retain native details/summary and its popover enhancement without requiring an interactive circuit.");
    Require(enabledHtml.Contains("data-align-end=\"false\"") && enabledHtml.Contains("data-open-upward=\"false\""), "The default select must align to the logical start and prefer opening downward.");
    foreach (var alignEnd in new[] { false, true })
        foreach (var openUpward in new[] { false, true })
        {
            var directionHtml = await Render(false, alignEnd, openUpward);
            Require(directionHtml.Contains($"data-align-end=\"{alignEnd.ToString().ToLowerInvariant()}\"") && directionHtml.Contains($"data-open-upward=\"{openUpward.ToString().ToLowerInvariant()}\""), "Each independent direction parameter must reach the rendered select root.");
        }
    Require(Regex.IsMatch(enabledHtml, "<a\\b[^>]*href=\"/docs\""), "SSR must emit a real href so an enabled option works without interactive rendering.");
    Require(!enabledHtml.Contains("href=\"/restricted\"") && Regex.Matches(enabledHtml, @"<button\b[^>]*\bdisabled(?:\s|=|>)").Count == 1, "A disabled link option must render as a disabled button without a navigable href.");
    var disabledHtml = await Render(true);
    Require(!Regex.IsMatch(disabledHtml, @"<a\b") && Regex.Matches(disabledHtml, @"<button\b[^>]*\bdisabled(?:\s|=|>)").Count == items.Length, "Disabling the whole component must turn every link into a disabled button.");
}

static async Task DropdownMenuRenderingContract()
{
    const int depth = 12;
    var branch = new DropdownMenuItem { Key = "deep", Text = "Deep action" };
    for (var level = depth; level > 0; level--)
        branch = new DropdownMenuItem { Text = $"Level {level}", Href = "/group-must-not-navigate", Children = [branch] };
    var items = new[]
    {
        branch,
        new DropdownMenuItem { Text = "Documentation", Href = "/docs", Selected = true },
        new DropdownMenuItem { Text = "Restricted", Href = "/restricted", Disabled = true },
        new DropdownMenuItem { Key = "selected", Text = "Selected action", Selected = true },
        new DropdownMenuItem { Key = "other", Text = "Other action", Selected = false }
    };
    using var services = new ServiceCollection().AddSingleton<NavigationManager>(new TestNavigation()).BuildServiceProvider();
    await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
    async Task<string> Render(bool disabled, bool alignEnd = false, bool openUpward = false, string? menuWidth = null) => await renderer.Dispatcher.InvokeAsync(async () =>
    {
        var parameters = new Dictionary<string, object?>
        {
            [nameof(DropdownMenu.Items)] = items,
            [nameof(DropdownMenu.Disabled)] = disabled,
            [nameof(DropdownMenu.AlignEnd)] = alignEnd,
            [nameof(DropdownMenu.OpenUpward)] = openUpward
        };
        if (menuWidth is not null) parameters[nameof(DropdownMenu.MenuWidth)] = menuWidth;
        var rendered = await renderer.RenderComponentAsync<DropdownMenu>(ParameterView.FromDictionary(parameters));
        return rendered.ToHtmlString();
    });

    var html = await Render(false);
    Require(html.Contains("<silmoon-module src=\"https://example.test/nested-app/Components/DropdownMenu.razor.js?v=4\""), "SSR must declare the module with the application base path without invoking interactive JS.");
    Require(html.Contains("style=\"--dropdown-menu-width: 12.5rem\"") && html.Contains("data-menu-width=\"12.5rem\"") && html.Contains("data-auto-width=\"false\""), "The default menu width must be 12.5rem, equivalent to 200px at a 16px root font, and expose the same value to position tracking.");
    foreach (var width in new[] { (Input: " auto ", Expected: "max-content", Auto: true), (Input: "AUTO", Expected: "max-content", Auto: true), (Input: " 20rem ", Expected: "20rem", Auto: false), (Input: "calc(100vw - 2rem)", Expected: "calc(100vw - 2rem)", Auto: false), (Input: "  ", Expected: "12.5rem", Auto: false) })
    {
        var widthHtml = await Render(false, menuWidth: width.Input);
        Require(widthHtml.Contains($"style=\"--dropdown-menu-width: {width.Expected}\""), "MenuWidth must support content sizing and custom CSS lengths, trim input and restore the default for blank values.");
        Require(widthHtml.Contains($"data-menu-width=\"{width.Expected}\""), "The normalized width must be available to position tracking even when a parameter change preserves the same rendered dimensions.");
        Require(widthHtml.Contains($"data-auto-width=\"{width.Auto.ToString().ToLowerInvariant()}\""), "Only content-sized widths must request automatic width handling from the module.");
    }
    Require(html.Contains("data-align-end=\"false\"") && html.Contains("data-open-upward=\"false\""), "The default menu must declare logical-start alignment and downward preference.");
    Require(html.Contains("data-bs-display=\"static\"") && html.Contains("popover=\"manual\"") && !html.Contains("dropdown-menu-end"), "Bootstrap must own the toggle while the component owns top-layer positioning without forced end alignment.");
    var upwardEndHtml = await Render(false, alignEnd: true, openUpward: true);
    Require(upwardEndHtml.Contains("data-align-end=\"true\"") && upwardEndHtml.Contains("data-open-upward=\"true\""), "Explicit alignment and direction parameters must reach the positioning module.");
    var panels = Regex.Matches(html, "data-dropdown-menu-panel=\"([^\"]+)\"").Select(match => match.Groups[1].Value).ToArray();
    var expectedPanels = Enumerable.Range(0, depth + 1).Select(level => "root" + string.Concat(Enumerable.Repeat("-0", level))).ToArray();
    Require(panels.SequenceEqual(expectedPanels), "Menu groups must recurse beyond any fixed submenu depth and preserve stable parent paths.");
    var parents = Regex.Matches(html, "data-dropdown-menu-back=\"([^\"]+)\"").Select(match => match.Groups[1].Value).ToArray();
    Require(parents.SequenceEqual(expectedPanels.Take(depth)), "Every nested panel must return to its immediate parent.");
    Require(Regex.Matches(html, @"<div\b[^>]*data-dropdown-menu-panel[^>]*\bhidden(?:\s|=|>)").Count == depth, "Only the root panel may be visible on first render.");
    Require(!html.Contains("href=\"/group-must-not-navigate\"") && Regex.Matches(html, "data-dropdown-menu-open=").Count == depth, "Children must take precedence over Href and render group buttons rather than navigation links.");
    Require(Regex.IsMatch(html, "<a\\b[^>]*href=\"/docs\"[^>]*aria-current=\"true\""), "An enabled selected link must retain its real href and current-state accessibility attribute in SSR.");
    Require(!html.Contains("href=\"/restricted\"") && Regex.Matches(html, @"<button\b[^>]*\bdisabled(?:\s|=|>)").Count == 1, "A disabled Href must become a disabled button without a navigable URL.");
    Require(html.Contains("aria-pressed=\"true\"") && html.Contains("aria-pressed=\"false\""), "Selected and unselected action states must remain distinguishable.");
    var secondHtml = await Render(false);
    Require(Regex.Match(html, "aria-controls=\"([^\"]+)\"").Groups[1].Value != Regex.Match(secondHtml, "aria-controls=\"([^\"]+)\"").Groups[1].Value, "Separate instances must use separate menu IDs.");
    var disabledHtml = await Render(true);
    Require(!Regex.IsMatch(disabledHtml, @"<a\b"), "Disabling the whole menu must remove all navigable links.");
    var interactiveButtons = Regex.Matches(disabledHtml, @"<button\b[^>]*>").Select(match => match.Value).Where(tag => !tag.Contains("data-dropdown-menu-back="));
    Require(interactiveButtons.All(tag => Regex.IsMatch(tag, @"\bdisabled(?:\s|=|>)")), "Disabling the component must disable its trigger, groups and every leaf option.");
}

static async Task DropdownMenuSelectionContract()
{
    var menu = new DropdownMenu();
    var first = new DropdownMenuItem { Key = "first", Text = "First" };
    var unavailable = new DropdownMenuItem { Key = "disabled", Text = "Disabled", Disabled = true };
    var calls = new List<DropdownMenuItem>();
    Set(menu, nameof(menu.Items), new[] { first, unavailable });
    Set(menu, nameof(menu.ItemSelected), EventCallback.Factory.Create<DropdownMenuItem>(calls, (Action<DropdownMenuItem>)calls.Add));
    await InvokeAsync(menu, "SelectItem", first);
    Require(calls.Count == 1 && ReferenceEquals(calls[0], first), "ItemSelected must return the original leaf item exactly once for an action.");
    await InvokeAsync(menu, "SelectItem", unavailable);
    Set(menu, nameof(menu.Disabled), true);
    await InvokeAsync(menu, "SelectItem", first);
    Require(calls.Count == 1, "Disabled items and a queued callback after the component is disabled must not invoke ItemSelected.");
    Set(menu, nameof(menu.Disabled), false);
    await InvokeAsync(menu, "SelectItem", first);
    Require(calls.Count == 2 && ReferenceEquals(calls[1], first), "Re-enabling must restore action callbacks, including repeated activation of the same item.");
}

static async Task ContentCardRenderingContract()
{
    using var services = new ServiceCollection().BuildServiceProvider();
    await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
    async Task<string> Render(Dictionary<string, object?>? parameters = null) => await renderer.Dispatcher.InvokeAsync(async () =>
    {
        var rendered = await renderer.RenderComponentAsync<ContentCard>(ParameterView.FromDictionary(parameters ?? new()));
        return rendered.ToHtmlString();
    });

    var emptyHtml = await Render();
    Require(!Regex.IsMatch(emptyHtml, @"<h[1-6]\b") && !emptyHtml.Contains("aria-labelledby="), "An untitled card must not emit an empty heading or a dangling accessible-name reference.");
    Require(!emptyHtml.Contains("<header") && !emptyHtml.Contains("<footer") && !emptyHtml.Contains("bi-person") && !emptyHtml.Contains("Trading"), "An empty general-purpose card must not force authentication branding, an icon or empty slots.");
    Require(!emptyHtml.Contains("content-card-centered") && emptyHtml.Contains("--content-card-width: 100%") && emptyHtml.Contains("--content-card-max-width: 100%"), "Cards must use available width without forcing centered authentication-page layout.");

    var parameters = new Dictionary<string, object?>
    {
        [nameof(ContentCard.Title)] = "Settings & status",
        [nameof(ContentCard.Brand)] = "Example workspace",
        [nameof(ContentCard.Description)] = "Choose <safe> content",
        [nameof(ContentCard.Icon)] = "bi-gear",
        [nameof(ContentCard.Class)] = "project-settings",
        [nameof(ContentCard.Width)] = " 80% ",
        [nameof(ContentCard.MaxWidth)] = " 36rem ",
        [nameof(ContentCard.AdditionalAttributes)] = new Dictionary<string, object> { ["data-purpose"] = "settings", ["style"] = "background: #123456" },
        [nameof(ContentCard.ChildContent)] = (RenderFragment)(builder => { builder.OpenElement(0, "p"); builder.AddContent(1, "Body supplied by the page"); builder.CloseElement(); }),
        [nameof(ContentCard.FooterContent)] = (RenderFragment)(builder => { builder.OpenElement(0, "a"); builder.AddAttribute(1, "href", "/help"); builder.AddContent(2, "Footer supplied by the page"); builder.CloseElement(); })
    };
    var html = await Render(parameters);
    var heading = Regex.Match(html, "<h2\\b[^>]*id=\"([^\"]+)\"[^>]*>Settings &amp; status</h2>");
    Require(heading.Success && Regex.Matches(html, @"<h[1-6]\b").Count == 1, "A titled general card must emit one level-two heading by default and encode its text.");
    var titleId = heading.Groups[1].Value;
    Require(Regex.Matches(html, $"\\bid=\"{Regex.Escape(titleId)}\"").Count == 1 && html.Contains($"aria-labelledby=\"{titleId}\""), "The card's accessible name must point at its single generated title ID.");
    Require(html.Contains("Example workspace") && html.Contains("bi-gear") && html.Contains("Choose &lt;safe&gt; content"), "Optional brand, icon and description must render without allowing description HTML.");
    Require(Regex.IsMatch(html, "<section\\b[^>]*class=\"[^\"]*project-settings[^\"]*\"[^>]*data-purpose=\"settings\"") && html.Contains("style=\"background: #123456\""), "Class and unmatched attributes, including a caller-supplied style, must reach the card section.");
    Require(Regex.IsMatch(html, "<div\\b[^>]*style=\"[^\"]*--content-card-width: 80%; --content-card-max-width: 36rem;[^\"]*\""), "Trimmed width settings must remain inherited from the container when the caller supplies a section style.");
    Require(html.Contains("Body supplied by the page") && Regex.IsMatch(html, "<footer\\b[^>]*>.*href=\"/help\".*Footer supplied by the page.*</footer>", RegexOptions.Singleline), "The card must preserve arbitrary body and footer content, including real footer links.");
    var secondHtml = await Render(parameters);
    Require(!secondHtml.Contains($"id=\"{titleId}\""), "Multiple cards rendered in one renderer must not reuse title IDs.");

    var brandingOnly = await Render(new() { [nameof(ContentCard.Title)] = " ", [nameof(ContentCard.Brand)] = "Example workspace" });
    Require(brandingOnly.Contains("Example workspace") && !Regex.IsMatch(brandingOnly, @"<h[1-6]\b") && !brandingOnly.Contains("aria-labelledby="), "Branding may be shown without inventing a heading for a whitespace title.");
    var signInHtml = await Render(new() { [nameof(ContentCard.Title)] = "Welcome", [nameof(ContentCard.Brand)] = "Trading Server", [nameof(ContentCard.Icon)] = "bi-box-arrow-in-right", [nameof(ContentCard.Centered)] = true, [nameof(ContentCard.MaxWidth)] = "480px", [nameof(ContentCard.HeadingLevel)] = 1 });
    Require(signInHtml.Contains("content-card-centered") && signInHtml.Contains("--content-card-max-width: 480px") && Regex.IsMatch(signInHtml, "<h1\\b[^>]*>Welcome</h1>") && signInHtml.Contains("Trading Server") && signInHtml.Contains("bi-box-arrow-in-right"), "Authentication callers must be able to retain their centered 480px page, explicit brand/icon and level-one heading.");
    foreach (var level in new[] { 0, 9 })
    {
        var boundedHtml = await Render(new() { [nameof(ContentCard.Title)] = "Bounded", [nameof(ContentCard.HeadingLevel)] = level });
        Require(Regex.IsMatch(boundedHtml, $"<h{Math.Clamp(level, 1, 6)}\\b[^>]*>Bounded</h{Math.Clamp(level, 1, 6)}>"), "Out-of-range heading levels must still produce valid semantic heading elements.");
    }
    var fallbackHtml = await Render(new() { [nameof(ContentCard.Width)] = " ", [nameof(ContentCard.MaxWidth)] = " " });
    Require(fallbackHtml.Contains("--content-card-width: 100%") && fallbackHtml.Contains("--content-card-max-width: 100%"), "Blank width values must retain the default layout instead of producing invalid empty declarations.");
}

static async Task ConfirmDialogLoadingContract()
{
    var js = new ConfirmJsRuntime();
    var navigation = new TestNavigation();
    using var services = new ServiceCollection().AddSingleton<NavigationManager>(navigation).AddSingleton<IJSRuntime>(js).BuildServiceProvider();
    await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
    var html = await renderer.Dispatcher.InvokeAsync(async () => (await renderer.RenderComponentAsync<ConfirmDialog>()).ToHtmlString());
    Require(js.Calls.Count == 0, "Static rendering must not invoke JavaScript interop.");
    Require(html.Contains("<silmoon-module src=\"https://example.test/nested-app/Components/ConfirmDialog.razor.js?v=4\""), "The static template must declare the same module URL as interactive calls.");
    Require(html.Contains("data-module-src=\"https://example.test/nested-app/Components/ConfirmDialog.razor.js?v=4\""), "Native callers must be able to await the component-declared module without maintaining its path or version.");

    await using var dialog = new ConfirmDialog();
    Set(dialog, "Js", js);
    Set(dialog, "Navigation", navigation);
    Require(await dialog.ConfirmAsync("First") && await dialog.ConfirmAsync("Second"), "Both calls must await the module before invoking the confirmation API.");
    Require(js.Calls.Select(call => call.Identifier).SequenceEqual(new[] { "import", "SiteDialogs.confirm", "SiteDialogs.confirm" }), "Repeated confirmation calls must import once and preserve the public API.");
    Require((string?)js.Calls[0].Arguments?[0] == "https://example.test/nested-app/Components/ConfirmDialog.razor.js?v=4", "Interactive import and the static declaration must share the absolute module URL.");
}

static Task TimeInputEndOfDayContract()
{
    var input = new TimeInput();
    var endOfDay = TimeSpan.FromDays(1);
    var arguments = new object?[] { "24:00", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "24:00 must be rejected when AllowEndOfDay is false.");
    Require(!string.IsNullOrEmpty((string?)arguments[2]), "Rejected end-of-day input must provide a validation message.");
    Require(Invoke(input, "FormatValueAsString", endOfDay) is null, "A day boundary must not format as a valid time when AllowEndOfDay is false.");

    arguments = new object?[] { "23:59", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == new TimeSpan(23, 59, 0), "23:59 must parse to the corresponding TimeSpan.");
    Require((string?)Invoke(input, "FormatValueAsString", new TimeSpan(9, 5, 0)) == "09:05", "Time values must format as HH:mm.");
    foreach (var partialTime in new[] { "10:3", "1:30" })
    {
        arguments = new object?[] { partialTime, null, null };
        Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "Partial time input must remain invalid until both hour and minute contain two digits.");
    }
    arguments = new object?[] { "10:30", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == new TimeSpan(10, 30, 0), "A completed HH:mm value must parse without prematurely normalizing partial input.");

    Set(input, nameof(TimeInput.AllowEndOfDay), true);
    arguments = new object?[] { "24:00", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == endOfDay && arguments[2] is null, "AllowEndOfDay must accept 24:00 as exactly one day without a validation error.");
    Require((string?)Invoke(input, "FormatValueAsString", endOfDay) == "24:00", "AllowEndOfDay must format exactly one day as 24:00.");
    arguments = new object?[] { "24:01", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "AllowEndOfDay must not permit times after 24:00.");
    Set(input, nameof(TimeInput.AllowEndOfDay), false);
    arguments = new object?[] { "24:00", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "Turning AllowEndOfDay off must restore the normal time range.");
    return Task.CompletedTask;
}

static async Task EnumSelectDisposalContract()
{
    foreach (var mode in new[] { "not-imported", "imported", "disconnected", "js-error" })
    {
        using var services = new ServiceCollection().AddSingleton<IJSRuntime>(new DisposalJsModule(mode)).BuildServiceProvider();
        var context = new EditContext(new EnumDisposalModel());
        EnumSelect<SampleMode>? picker = null;
        var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        await renderer.Dispatcher.InvokeAsync(() => renderer.RenderComponentAsync<EnumDisposalHost>(ParameterView.FromDictionary(new Dictionary<string, object?>
        {
            [nameof(EnumDisposalHost.Context)] = context,
            [nameof(EnumDisposalHost.Capture)] = (Action<EnumSelect<SampleMode>>)(component => picker = component)
        })));
        Require(picker is not null, "The actual enum component must be rendered inside the form context.");
        var validationEvent = typeof(EditContext).GetField("OnValidationStateChanged", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingFieldException(nameof(EditContext), "OnValidationStateChanged");
        bool HasPickerSubscription() => ((Delegate?)validationEvent.GetValue(context))?.GetInvocationList().Any(handler => ReferenceEquals(handler.Target, picker)) == true;
        Require(HasPickerSubscription(), "Rendering the input must establish its real framework validation subscription.");
        var module = new DisposalJsModule(mode);
        if (mode != "not-imported") Set(picker!, "JsModule", module);
        Exception? disposalError = null;
        try { await renderer.DisposeAsync(); }
        catch (Exception exception) { disposalError = exception; }
        Require(!HasPickerSubscription(), $"The {mode} disposal path must release the InputBase validation subscription.");
        Require(mode == "js-error" ? disposalError?.GetBaseException() is JSException : disposalError is null, "Unexpected JS failures must remain visible while disconnected circuits are tolerated.");
        if (mode == "imported") Require(module.DisposeCalls == 1, "The imported JS module must also be disposed exactly once.");
    }
}

static void Require(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

static PropertyInfo Property(object component, string name) => component.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic) ?? throw new MissingMemberException(component.GetType().FullName, name);
static T Get<T>(object component, string name) => (T)Property(component, name).GetValue(component)!;
static void Set(object component, string name, object? value) => Property(component, name).SetValue(component, value);
static object? Invoke(object component, string name, params object?[] arguments) => Method(component.GetType(), name, BindingFlags.Instance).Invoke(component, arguments);
static object? InvokeStatic(Type componentType, string name, params object?[] arguments) => Method(componentType, name, BindingFlags.Static).Invoke(null, arguments);
static MethodInfo Method(Type componentType, string name, BindingFlags scope) => componentType.GetMethod(name, scope | BindingFlags.Public | BindingFlags.NonPublic) ?? throw new MissingMethodException(componentType.FullName, name);
static async Task InvokeAsync(object component, string name, params object?[] arguments)
{
    if (Invoke(component, name, arguments) is Task task) await task;
    else throw new InvalidOperationException($"{component.GetType().Name}.{name} did not return a Task.");
}

enum SampleMode
{
    [Display(Name = "列表", Description = "按列表展示内容。")]
    List = 1,
    Grid = 2
}

sealed class EnumDisposalModel
{
    public SampleMode Mode { get; set; } = SampleMode.List;
}

sealed class EnumDisposalHost : ComponentBase
{
    [Parameter] public EditContext Context { get; set; } = default!;
    [Parameter] public Action<EnumSelect<SampleMode>> Capture { get; set; } = default!;

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        var model = (EnumDisposalModel)Context.Model;
        builder.OpenComponent<CascadingValue<EditContext>>(0);
        builder.AddAttribute(1, "Value", Context);
        builder.AddAttribute(2, "ChildContent", (RenderFragment)(child =>
        {
            child.OpenComponent<EnumSelect<SampleMode>>(0);
            child.AddAttribute(1, "Value", model.Mode);
            child.AddAttribute(2, "ValueExpression", (System.Linq.Expressions.Expression<Func<SampleMode>>)(() => model.Mode));
            child.AddComponentReferenceCapture(3, component => Capture((EnumSelect<SampleMode>)component));
            child.CloseComponent();
        }));
        builder.CloseComponent();
    }
}

sealed class DisposalJsModule(string mode) : IJSRuntime, IJSObjectReference
{
    public int DisposeCalls { get; private set; }
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => InvokeAsync<TValue>(identifier, CancellationToken.None, args);
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        if (identifier == "dispose" && mode == "disconnected") throw new JSDisconnectedException("Expected disconnected test circuit.");
        if (identifier == "dispose" && mode == "js-error") throw new JSException("Expected JS disposal failure.");
        return ValueTask.FromResult(default(TValue)!);
    }
    public ValueTask DisposeAsync() { DisposeCalls++; return ValueTask.CompletedTask; }
}

sealed class TestNavigation : NavigationManager
{
    public TestNavigation() => Initialize("https://example.test/nested-app/", "https://example.test/nested-app/deep/page");
    protected override void NavigateToCore(string uri, bool forceLoad) => throw new NotSupportedException();
}

sealed class ConfirmJsRuntime : IJSRuntime
{
    public List<(string Identifier, object?[]? Arguments)> Calls { get; } = [];
    readonly IJSObjectReference Module = new DisposalJsModule("imported");
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => InvokeAsync<TValue>(identifier, CancellationToken.None, args);
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        Calls.Add((identifier, args));
        if (identifier == "import") return ValueTask.FromResult((TValue)(object)Module);
        if (identifier == "SiteDialogs.confirm") return ValueTask.FromResult((TValue)(object)true);
        return ValueTask.FromResult(default(TValue)!);
    }
}
