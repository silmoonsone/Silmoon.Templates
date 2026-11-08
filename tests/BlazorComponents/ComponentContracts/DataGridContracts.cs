using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using Silmoon.AspNetCore.Blazor.Components;

internal static class DataGridContracts
{
    sealed record Product(string Key, string Name);

    sealed class CaptureGrid : IComponentActivator
    {
        public DataGrid<Product> Grid { get; private set; } = null!;

        public IComponent CreateInstance(Type componentType)
        {
            var component = (IComponent)Activator.CreateInstance(componentType)!;
            if (component is DataGrid<Product> grid) Grid = grid;
            return component;
        }
    }

    public static async Task RunAsync()
    {
        var capture = new CaptureGrid();
        var js = new ConfirmJsRuntime();
        using var services = new ServiceCollection()
            .AddSingleton<IComponentActivator>(capture)
            .AddSingleton<IJSRuntime>(js)
            .AddSingleton<NavigationManager>(new TestNavigation())
            .BuildServiceProvider();
        await using var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        await renderer.Dispatcher.InvokeAsync(async () =>
        {
            Product[] products = [new("b", "Beta"), new("a", "Alpha")];
            var clicks = new List<DataGridRowEvent<Product>>();
            var opens = new List<DataGridRowEvent<Product>>();
            var selections = new List<string?>();
            var parameters = new Dictionary<string, object?>
            {
                [nameof(DataGrid<Product>.Items)] = products,
                [nameof(DataGrid<Product>.Label)] = "Products",
                [nameof(DataGrid<Product>.RowKey)] = (Func<Product, string>)(product => product.Key),
                [nameof(DataGrid<Product>.RowTemplate)] = (RenderFragment<Product>)(product => builder =>
                {
                    builder.OpenElement(0, "td");
                    builder.AddContent(1, product.Name);
                    builder.CloseElement();
                }),
                [nameof(DataGrid<Product>.OnRowClick)] = EventCallback.Factory.Create<DataGridRowEvent<Product>>(clicks, clicks.Add),
                [nameof(DataGrid<Product>.OnRowDoubleClick)] = EventCallback.Factory.Create<DataGridRowEvent<Product>>(opens, opens.Add),
                [nameof(DataGrid<Product>.OnSelectionChanged)] = EventCallback.Factory.Create<string?>(selections, selections.Add)
            };
            var rendered = await renderer.RenderComponentAsync<DataGrid<Product>>(ParameterView.FromDictionary(parameters));
            var grid = capture.Grid;
            Check(RowKeys(rendered.ToHtmlString()).SequenceEqual(["b", "a"]), "SSR must render model rows in their supplied order.");
            await grid.ApplyGridOrder(["a", "b"]);
            Check(RowKeys(rendered.ToHtmlString()).SequenceEqual(["a", "b"]), "Blazor must render the requested sort using stable keys.");
            await grid.NotifyGridSelection("b");
            await grid.NotifyGridRow(false, "b", "name", 1, 0);
            await grid.NotifyGridRow(true, "a", "name", 0, 0);
            await grid.NotifyGridRow(false, "no-longer-present", "name", 0, 0);
            Check(clicks.Count == 1 && ReferenceEquals(clicks[0].Item, products[0]) &&
                clicks[0] == new DataGridRowEvent<Product>(products[0], "b", "name", 1, 0), "Click must return the original item and current coordinates, ignoring stale keys.");
            Check(opens.Count == 1 && ReferenceEquals(opens[0].Item, products[1]) &&
                opens[0] == new DataGridRowEvent<Product>(products[1], "a", "name", 0, 0), "Double click must return its own row and coordinates.");
            Check(selections.SequenceEqual(["b"]), "Selection must report the stable key.");

            parameters[nameof(DataGrid<Product>.JavaScriptManaged)] = true;
            var shell = await renderer.RenderComponentAsync<DataGrid<Product>>(ParameterView.FromDictionary(parameters));
            var html = shell.ToHtmlString();
            Check(html.Contains("data-grid-body") && html.Contains("aria-label=\"Products\"") && !RowKeys(html).Any(),
                "A JS-managed shell must expose an accessible table with an empty body for the row owner.");
            Check(js.Calls.Count == 0, "Static rendering must complete without JavaScript interop.");
        });
    }

    static IEnumerable<string> RowKeys(string html) =>
        Regex.Matches(html, "data-grid-key=\"([^\"]+)\"").Select(match => match.Groups[1].Value);

    static void Check(bool success, string message)
    {
        if (!success) throw new InvalidOperationException(message);
    }
}
