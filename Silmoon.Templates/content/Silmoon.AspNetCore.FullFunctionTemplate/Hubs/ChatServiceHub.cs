using Microsoft.AspNetCore.SignalR;
using Silmoon.AspNetCore.FullFunctionTemplate.Services;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Hubs
{
    public class ChatServiceHub : Hub
    {
        public ChatService ChatService { get; init; }

        public ChatServiceHub(ChatService chatService)
        {
            ChatService = chatService;
        }

        public Task SendToMe(string message) => ChatService.SendToMe(Context, message);

        public Task SendToAll(string message) => ChatService.SendToAll(Context, message);

        public Task SendToUser(string username, string message) => ChatService.SendToUser(Context, username, message);

        public Task UserSignIn(string username) => ChatService.UserSignIn(Context, username);

        public Task UserSignOut(string username) => ChatService.UserSignOut(Context, username);

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await ChatService.HandleDisconnect(Context);
            await base.OnDisconnectedAsync(exception);
        }
    }
}
