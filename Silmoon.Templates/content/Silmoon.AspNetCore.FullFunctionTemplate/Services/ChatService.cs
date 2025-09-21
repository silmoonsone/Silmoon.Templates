using Microsoft.AspNetCore.SignalR;
using Silmoon.AspNetCore.FullFunctionTemplate.Hubs;
using Silmoon.Collections;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Services
{
    public class ChatService
    {
        private readonly IHubContext<ChatServiceHub> chatServiceHub;
        private static readonly ConcurrentTwoWayDictionary<string, string> _connections = [];
        public ChatService(IHubContext<ChatServiceHub> hubContext)
        {
            chatServiceHub = hubContext;
        }

        public async Task SendToMe(HubCallerContext context, string message)
        {
            if (!_connections.ContainsValue(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(context.ConnectionId).FirstOrDefault(), message, false);
        }

        public async Task SendToAll(HubCallerContext context, string message)
        {
            if (!_connections.ContainsValue(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            await chatServiceHub.Clients.All.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(context.ConnectionId).FirstOrDefault(), message, false);
        }

        public async Task SendToUser(HubCallerContext context, string username, string message)
        {
            if (!_connections.ContainsValue(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            if (_connections.TryGetValues(username, out var connectionIds))
            {
                foreach (var connectionId in connectionIds)
                {
                    await chatServiceHub.Clients.Client(connectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(context.ConnectionId).FirstOrDefault(), message, true);
                }
            }
            else
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", $"User '{username}' does not exist.");
            }
        }

        public async Task UserSignIn(HubCallerContext context, string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.ContainsKey(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username already exists.");
                return;
            }

            _connections.Add(username, context.ConnectionId);
            await chatServiceHub.Clients.All.SendAsync("UserSignedIn", username);
        }

        public async Task UserSignOut(HubCallerContext context, string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.Remove(username, context.ConnectionId))
            {
                await chatServiceHub.Clients.All.SendAsync("UserSignedOut", username);
            }
        }

        public async Task HandleDisconnect(HubCallerContext context)
        {
            if (_connections.GetKeysOrDefault(context.ConnectionId).FirstOrDefault() is string username)
            {
                _connections.Remove(username, context.ConnectionId);
                await chatServiceHub.Clients.All.SendAsync("UserSignedOut", username);
            }
        }
    }
}