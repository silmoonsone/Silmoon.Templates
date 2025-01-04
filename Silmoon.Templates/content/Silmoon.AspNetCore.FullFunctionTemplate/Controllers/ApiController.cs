using Microsoft.AspNetCore.Mvc;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Controllers
{
    public class ApiController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
